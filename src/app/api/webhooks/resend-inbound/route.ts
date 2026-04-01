import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Resend inbound email webhook
// Docs: https://resend.com/docs/dashboard/webhooks/inbound-emails

interface ResendInboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  reply_to?: string;
  cc?: string;
  bcc?: string;
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

    const payload: ResendWebhookPayload = await request.json();

    if (payload.type !== 'email.received') {
      console.log(`[Resend Inbound] Ignoring event type: ${payload.type}`);
      return NextResponse.json({ received: true });
    }

    const email = payload.data;
    const { email: fromEmail, name: fromName } = parseEmailAddress(email.from);

    console.log(`[Resend Inbound] Received email from ${fromEmail}: ${email.subject}`);

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
        textContent: email.text || null,
        htmlContent: email.html || null,
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
