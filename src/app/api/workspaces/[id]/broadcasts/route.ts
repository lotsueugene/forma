import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// GET /api/workspaces/[id]/broadcasts - List broadcasts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const broadcasts = await prisma.respondentBroadcast.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: 'desc' },
      include: { form: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ broadcasts });
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 });
  }
}

// POST /api/workspaces/[id]/broadcasts - Create and optionally send a broadcast
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Gate behind Pro
    const info = await getSubscriptionInfo(id);
    if (info.plan === 'free') {
      return NextResponse.json({ error: 'Respondent broadcasts require Trial or Pro plan.' }, { status: 402 });
    }

    const body = await request.json();
    const { subject, content, formId, fromName, sendNow } = body;

    if (!subject || !content) {
      return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
    }

    // Extract respondent emails from submissions
    const submissionWhere: Record<string, unknown> = { form: { workspaceId: id } };
    if (formId) {
      submissionWhere.formId = formId;
    }

    const submissions = await prisma.submission.findMany({
      where: submissionWhere,
      select: { data: true, formId: true },
    });

    // Get email fields from forms
    const formIds = [...new Set(submissions.map(s => s.formId))];
    const forms = await prisma.form.findMany({
      where: { id: { in: formIds } },
      select: { id: true, fields: true },
    });

    const emailFieldMap = new Map<string, string[]>();
    for (const form of forms) {
      const fields = JSON.parse(form.fields) as Array<{ id: string; type: string }>;
      const emailFieldIds = fields.filter(f => f.type === 'email').map(f => f.id);
      emailFieldMap.set(form.id, emailFieldIds);
    }

    // Extract unique emails
    const emails = new Set<string>();
    for (const sub of submissions) {
      const data = JSON.parse(sub.data) as Record<string, unknown>;
      const fieldIds = emailFieldMap.get(sub.formId) || [];
      for (const fieldId of fieldIds) {
        const val = data[fieldId];
        if (typeof val === 'string' && val.includes('@') && val.includes('.')) {
          emails.add(val.toLowerCase().trim());
        }
      }
    }

    const recipientList = [...emails];

    // Create broadcast record
    const broadcast = await prisma.respondentBroadcast.create({
      data: {
        workspaceId: id,
        subject,
        content,
        fromName: fromName || null,
        formId: formId || null,
        recipientCount: recipientList.length,
        status: sendNow ? 'sending' : 'draft',
        createdBy: session.user.id,
      },
    });

    // Send if requested
    if (sendNow && resend && recipientList.length > 0) {
      // Get workspace branding
      const workspace = await prisma.workspace.findUnique({
        where: { id },
        select: { name: true, logoUrl: true },
      });

      const senderName = fromName || workspace?.name || 'Forma';
      const fromEmail = process.env.EMAIL_FROM || 'Forma <notifications@withforma.io>';

      // Get workspace owner's email for reply-to
      const owner = await prisma.workspaceMember.findFirst({
        where: { workspaceId: id, role: 'owner' },
        select: { user: { select: { email: true } } },
      });
      const replyTo = workspace?.notificationEmail || owner?.user?.email || undefined;

      // Send in background
      (async () => {
        let sent = 0;
        let failed = 0;
        const batchSize = 50;

        for (let i = 0; i < recipientList.length; i += batchSize) {
          const batch = recipientList.slice(i, i + batchSize);
          const promises = batch.map(async (email) => {
            try {
              await resend.emails.send({
                from: fromEmail,
                replyTo,
                to: email,
                subject,
                html: buildBroadcastEmail(content, senderName, workspace?.logoUrl),
              });
              sent++;
            } catch {
              failed++;
            }
          });
          await Promise.all(promises);

          // Update progress
          await prisma.respondentBroadcast.update({
            where: { id: broadcast.id },
            data: { sentCount: sent, failedCount: failed },
          });
        }

        // Final status
        await prisma.respondentBroadcast.update({
          where: { id: broadcast.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
            sentCount: sent,
            failedCount: failed,
          },
        });
      })();
    }

    return NextResponse.json({
      broadcast,
      recipientCount: recipientList.length,
      recipients: recipientList.slice(0, 10), // Preview first 10
    });
  } catch (error) {
    console.error('Error creating broadcast:', error);
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 });
  }
}

function buildBroadcastEmail(content: string, senderName: string, logoUrl?: string | null): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8f9fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <!-- Header -->
      <div style="padding:32px 32px 24px;border-bottom:1px solid #f0f0f0;">
        ${logoUrl
          ? `<img src="${logoUrl}" alt="${senderName}" style="height:32px;margin-bottom:8px;" />`
          : `<div style="font-size:18px;font-weight:600;color:#111827;">${senderName}</div>`
        }
      </div>
      <!-- Content -->
      <div style="padding:32px;color:#374151;font-size:15px;line-height:1.7;">
        ${content}
      </div>
    </div>
    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;color:#9ca3af;font-size:12px;">
      Sent by ${senderName} via <a href="https://withforma.io" style="color:#ef6f2e;text-decoration:none;">Forma</a>
    </div>
  </div>
</body>
</html>`;
}
