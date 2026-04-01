import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Forma <updates@forma.app>';

// GET /api/admin/broadcasts - List all broadcasts
export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const broadcasts = await prisma.emailBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ broadcasts });
  } catch (error) {
    console.error('Admin broadcasts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch broadcasts' },
      { status: 500 }
    );
  }
}

// POST /api/admin/broadcasts - Create and optionally send broadcast
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      subject,
      content,
      targetAll = true,
      targetPlans,
      sendNow = false,
    } = body;

    if (!subject || !content) {
      return NextResponse.json(
        { error: 'Subject and content are required' },
        { status: 400 }
      );
    }

    // Create broadcast record
    const broadcast = await prisma.emailBroadcast.create({
      data: {
        subject,
        content,
        targetAll,
        targetPlans,
        status: sendNow ? 'sending' : 'draft',
        createdBy: admin.user.id,
      },
    });

    // If sendNow, start sending emails
    if (sendNow) {
      // Don't await - send in background
      sendBroadcastEmails(broadcast.id, subject, content, targetAll, targetPlans)
        .catch(err => console.error('Broadcast send error:', err));
    }

    return NextResponse.json({ broadcast });
  } catch (error) {
    console.error('Admin create broadcast error:', error);
    return NextResponse.json(
      { error: 'Failed to create broadcast' },
      { status: 500 }
    );
  }
}

async function sendBroadcastEmails(
  broadcastId: string,
  subject: string,
  content: string,
  targetAll: boolean,
  targetPlans: string | null
) {
  if (!resend) {
    console.error('Resend not configured');
    await prisma.emailBroadcast.update({
      where: { id: broadcastId },
      data: { status: 'failed' },
    });
    return;
  }

  try {
    // Build user query
    const planFilter = targetPlans?.split(',').map(p => p.trim()) || null;

    // Get all users with their subscription plans
    // Only exclude users who explicitly opted out of marketing
    const users = await prisma.user.findMany({
      where: {
        email: { not: null },
        OR: [
          // User has settings and hasn't opted out
          { settings: { notifyMarketing: true } },
          // User has no settings record (default is to receive)
          { settings: null },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        workspaceMembers: {
          select: {
            workspace: {
              select: {
                subscription: {
                  select: { plan: true },
                },
              },
            },
          },
        },
      },
    });

    // Filter by plan if needed
    const targetUsers = targetAll
      ? users
      : users.filter(user => {
          const userPlans = user.workspaceMembers
            .map(wm => wm.workspace.subscription?.plan)
            .filter(Boolean);
          return planFilter?.some(plan => userPlans.includes(plan));
        });

    let sentCount = 0;
    let failedCount = 0;

    // Send emails in batches
    const batchSize = 50;
    for (let i = 0; i < targetUsers.length; i += batchSize) {
      const batch = targetUsers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          if (!user.email) return;

          try {
            await resend.emails.send({
              from: EMAIL_FROM,
              to: user.email,
              subject,
              html: content.replace('{{name}}', user.name || 'there'),
            });
            sentCount++;
          } catch (err) {
            console.error(`Failed to send to ${user.email}:`, err);
            failedCount++;
          }
        })
      );

      // Update progress
      await prisma.emailBroadcast.update({
        where: { id: broadcastId },
        data: { sentCount, failedCount },
      });
    }

    // Mark as sent
    await prisma.emailBroadcast.update({
      where: { id: broadcastId },
      data: {
        status: 'sent',
        sentAt: new Date(),
        sentCount,
        failedCount,
      },
    });
  } catch (error) {
    console.error('Broadcast send error:', error);
    await prisma.emailBroadcast.update({
      where: { id: broadcastId },
      data: { status: 'failed' },
    });
  }
}
