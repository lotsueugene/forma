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
  const match = address.match(/^(?:(.+?)\s*)?<?([^\s<>]+@[^\s<>]+)>?$/);
  if (match) {
    return {
      name: match[1]?.trim() || null,
      email: match[2].toLowerCase(),
    };
  }
  return { email: address.toLowerCase(), name: null };
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('resend-signature');
      // For production, verify the signature
      // See: https://resend.com/docs/dashboard/webhooks/secure-your-webhook-endpoint
      if (!signature) {
        console.warn('[Resend Inbound] Missing webhook signature');
        // Continue anyway for now, but log warning
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

    if (resend && email.email_id && !textContent && !htmlContent) {
      try {
        console.log(`[Resend Inbound] Fetching email content for ${email.email_id}`);
        const fullEmail = await resend.emails.get(email.email_id);
        console.log(`[Resend Inbound] Full email data:`, JSON.stringify(fullEmail, null, 2));
        if (fullEmail.data) {
          textContent = (fullEmail.data as { text?: string }).text || null;
          htmlContent = (fullEmail.data as { html?: string }).html || null;
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
