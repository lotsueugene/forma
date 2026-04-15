import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, isEmailConfigured } from '@/lib/email';

// GET /api/cron/process-emails — Process pending scheduled emails
// Call this via cron every minute: curl https://withforma.io/api/cron/process-emails?key=SECRET
export async function GET(request: NextRequest) {
  const cronKey = request.nextUrl.searchParams.get('key');
  if (cronKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }

  try {
    // Find pending emails that are due
    const pendingEmails = await prisma.scheduledEmail.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: new Date() },
      },
      take: 20, // Process in batches
      orderBy: { scheduledFor: 'asc' },
    });

    let sent = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      try {
        await sendEmail({
          to: email.to,
          subject: email.subject,
          html: email.body,
        });

        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: 'sent', sentAt: new Date() },
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send scheduled email ${email.id}:`, err);
        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: 'failed' },
        });
        failed++;
      }
    }

    return NextResponse.json({ processed: pendingEmails.length, sent, failed });
  } catch (error) {
    console.error('Error processing scheduled emails:', error);
    return NextResponse.json({ error: 'Failed to process emails' }, { status: 500 });
  }
}
