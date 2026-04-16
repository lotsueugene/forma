import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend inbound email webhook
// Docs: https://resend.com/docs/dashboard/webhooks/inbound-emails

interface ResendInboundEmail {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  email_id?: string;
  reply_to?: string;
  cc?: string | string[];
  bcc?: string | string[];
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: string;
    content_type: string;
  }>;
}

interface ResendWebhookPayload {
  type: 'email.received';
  created_at: string;
  data: ResendInboundEmail;
}

// Extract name and email from "Name <email@example.com>" format
function parseEmailAddress(address: string): { email: string; name: string | null } {
  // Format: "Name <email@example.com>" or just "email@example.com"
  const bracketMatch = address.match(/^(.+?)\s*<([^<>]+@[^<>]+)>$/);
  if (bracketMatch) {
    return {
      name: bracketMatch[1].trim() || null,
      email: bracketMatch[2].toLowerCase().trim(),
    };
  }

  // Just an email address without brackets
  const emailOnly = address.match(/^([^\s<>]+@[^\s<>]+)$/);
  if (emailOnly) {
    return {
      name: null,
      email: emailOnly[1].toLowerCase().trim(),
    };
  }

  return { email: address.toLowerCase().trim(), name: null };
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const svixId = request.headers.get('svix-id');
      const svixTimestamp = request.headers.get('svix-timestamp');
      const svixSignature = request.headers.get('svix-signature');

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.warn('[Resend Inbound] Missing webhook signature headers');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      // Reject events older than 5 minutes (replay protection)
      const timestampSeconds = parseInt(svixTimestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestampSeconds) > 300) {
        console.warn('[Resend Inbound] Webhook timestamp too old, possible replay');
        return NextResponse.json({ error: 'Timestamp expired' }, { status: 401 });
      }

      // Verify HMAC signature
      const { createHmac } = await import('crypto');
      const body = await request.clone().text();
      const signedContent = `${svixId}.${svixTimestamp}.${body}`;
      // Resend webhook secrets are prefixed with "whsec_"
      const secret = webhookSecret.startsWith('whsec_')
        ? Buffer.from(webhookSecret.slice(6), 'base64')
        : Buffer.from(webhookSecret);
      const expectedSignature = createHmac('sha256', secret)
        .update(signedContent)
        .digest('base64');

      const signatures = svixSignature.split(' ').map((s) => s.split(',')[1] || s);
      if (!signatures.some((sig) => sig === expectedSignature)) {
        console.warn('[Resend Inbound] Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = await request.json();

    // Log full payload for debugging
    console.log(`[Resend Inbound] Full payload:`, JSON.stringify(payload, null, 2));

    if (payload.type !== 'email.received') {
      console.log(`[Resend Inbound] Ignoring event type: ${payload.type}`);
      return NextResponse.json({ received: true });
    }

    const email = payload.data;
    const { email: fromEmail, name: fromName } = parseEmailAddress(email.from);

    console.log(`[Resend Inbound] Received email from ${fromEmail}: ${email.subject}`);
    console.log(`[Resend Inbound] Email ID: ${email.email_id}`);

    // Try to fetch full email content using Resend API
    let textContent: string | null = email.text || null;
    let htmlContent: string | null = email.html || null;

    // Try fetching from Resend's inbound API directly
    if (email.email_id && !textContent && !htmlContent) {
      try {
        console.log(`[Resend Inbound] Fetching email content for ${email.email_id}`);

        // Try the inbound-specific endpoint
        const response = await fetch(`https://api.resend.com/emails/${email.email_id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[Resend Inbound] API response:`, JSON.stringify(data, null, 2));
          textContent = data.text || null;
          htmlContent = data.html || null;
        } else {
          console.log(`[Resend Inbound] API returned ${response.status}`);

          // Try inbound-specific endpoint
          const inboundResponse = await fetch(`https://api.resend.com/inbound-emails/${email.email_id}`, {
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            },
          });

          if (inboundResponse.ok) {
            const inboundData = await inboundResponse.json();
            console.log(`[Resend Inbound] Inbound API response:`, JSON.stringify(inboundData, null, 2));
            textContent = inboundData.text || inboundData.body || null;
            htmlContent = inboundData.html || null;
          } else {
            console.log(`[Resend Inbound] Inbound API returned ${inboundResponse.status}`);
          }
        }
      } catch (fetchError) {
        console.error(`[Resend Inbound] Failed to fetch email content:`, fetchError);
      }
    }

    console.log(`[Resend Inbound] Text content: ${textContent ? textContent.substring(0, 100) : 'NONE'}`);
    console.log(`[Resend Inbound] HTML content: ${htmlContent ? 'YES' : 'NONE'}`);

    // Try to find the original broadcast by looking at the subject
    // Broadcasts usually have "Re: Original Subject" when replied to
    let broadcastId: string | null = null;
    const subjectWithoutRe = email.subject.replace(/^Re:\s*/i, '').trim();

    const possibleBroadcast = await prisma.emailBroadcast.findFirst({
      where: {
        subject: subjectWithoutRe,
        status: 'sent',
      },
      orderBy: { sentAt: 'desc' },
    });

    if (possibleBroadcast) {
      broadcastId = possibleBroadcast.id;
      console.log(`[Resend Inbound] Linked to broadcast: ${possibleBroadcast.subject}`);
    }

    // Store the reply
    const reply = await prisma.broadcastReply.create({
      data: {
        broadcastId,
        fromEmail,
        fromName,
        subject: email.subject,
        textContent,
        htmlContent,
        resendEmailId: email.email_id || null,
        status: 'unread',
        receivedAt: new Date(payload.created_at),
      },
    });

    console.log(`[Resend Inbound] Stored reply: ${reply.id}`);

    return NextResponse.json({ success: true, replyId: reply.id });
  } catch (error) {
    console.error('[Resend Inbound] Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process inbound email' },
      { status: 500 }
    );
  }
}

// Allow GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'Resend inbound webhook endpoint active' });
}
