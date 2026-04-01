import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Forma <updates@forma.app>';

/**
 * Generate broadcast email HTML with Forma branding
 */
function generateBroadcastHtml(content: string, userName: string): string {
  // Convert plain text to HTML paragraphs
  const htmlContent = content
    .replace(/{{name}}/g, userName)
    .split(/\n\n+/)
    .map(para => `<p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header with Forma Logo -->
    <div style="padding: 0 0 32px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width: 32px; height: 32px;">
            <img src="https://withforma.io/icon.svg" alt="Forma" width="32" height="32" style="display: block;" />
          </td>
          <td style="padding-left: 12px; font-size: 20px; font-weight: 700; color: #1f2937;">Forma</td>
        </tr>
      </table>
    </div>

    <!-- Content -->
    <div style="padding: 0 0 32px;">
      ${htmlContent}
    </div>

    <!-- Footer -->
    <div style="padding: 24px 0 0; border-top: 1px solid #e5e5e5;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
        <a href="https://withforma.io" style="color: #ef6f2e; text-decoration: none;">Forma</a> — The modern way to build forms<br>
        <span style="color: #d1d5db;">You're receiving this because you signed up for Forma.</span>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

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

    // Get all users with email addresses
    // Admin broadcasts go to all users (platform communications)
    const users = await prisma.user.findMany({
      where: {
        email: { not: null },
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

    // All users are eligible for admin broadcasts (platform updates)
    const eligibleUsers = users;

    console.log(`[Broadcast] Found ${eligibleUsers.length} eligible users`);

    // Filter by plan if needed
    const targetUsers = targetAll
      ? eligibleUsers
      : eligibleUsers.filter(user => {
          const userPlans = user.workspaceMembers
            .map(wm => wm.workspace.subscription?.plan)
            .filter(Boolean);
          return planFilter?.some(plan => userPlans.includes(plan));
        });

    let sentCount = 0;
    let failedCount = 0;

    console.log(`[Broadcast] Sending to ${targetUsers.length} users`);

    // Send emails in batches
    const batchSize = 50;
    for (let i = 0; i < targetUsers.length; i += batchSize) {
      const batch = targetUsers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          if (!user.email) return;

          try {
            const userName = user.name || 'there';
            const html = generateBroadcastHtml(content, userName);
            await resend.emails.send({
              from: EMAIL_FROM,
              to: user.email,
              subject,
              html,
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
