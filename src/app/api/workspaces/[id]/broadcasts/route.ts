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

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = Math.min(50, parseInt(request.nextUrl.searchParams.get('limit') || '10'));
    const skip = (page - 1) * limit;

    const [broadcasts, total] = await Promise.all([
      prisma.respondentBroadcast.findMany({
        where: { workspaceId: id },
        orderBy: { createdAt: 'desc' },
        include: { form: { select: { id: true, name: true } } },
        take: limit,
        skip,
      }),
      prisma.respondentBroadcast.count({ where: { workspaceId: id } }),
    ]);

    return NextResponse.json({
      broadcasts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
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
    const { subject, content, formId, fromName, sendNow, previewOnly } = body;

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

    // Extract unique emails with names for personalization
    const recipientMap = new Map<string, string>(); // email -> name
    for (const sub of submissions) {
      const data = JSON.parse(sub.data) as Record<string, unknown>;
      const fieldIds = emailFieldMap.get(sub.formId) || [];
      for (const fieldId of fieldIds) {
        const val = data[fieldId];
        if (typeof val === 'string' && val.includes('@') && val.includes('.')) {
          const email = val.toLowerCase().trim();
          if (!recipientMap.has(email)) {
            // Try to find a name field (first text field that's not email)
            const formFields = JSON.parse(forms.find(f => f.id === sub.formId)?.fields || '[]') as Array<{ id: string; type: string }>;
            const nameField = formFields.find(f => f.type === 'text');
            const name = nameField ? String(data[nameField.id] || '') : '';
            recipientMap.set(email, name);
          }
        }
      }
    }

    // Filter out unsubscribed emails
    const allEmails = [...recipientMap.keys()];
    if (allEmails.length > 0) {
      const unsubscribed = await prisma.emailUnsubscribe.findMany({
        where: { email: { in: allEmails }, scope: id },
        select: { email: true },
      });
      for (const unsub of unsubscribed) recipientMap.delete(unsub.email);
    }

    const recipientList = [...recipientMap.keys()];

    // Preview only — return recipients without sending
    if (previewOnly) {
      return NextResponse.json({
        recipientCount: recipientList.length,
        recipients: recipientList.slice(0, 20),
      });
    }

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
        select: { name: true, logoUrl: true, notificationEmail: true },
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

        // Send sequentially with rate limiting (Resend: 5/sec max, use 3/sec)
        for (let i = 0; i < recipientList.length; i++) {
          const email = recipientList[i];
          const recipientName = recipientMap.get(email) || '';
          const baseUrl = process.env.NEXTAUTH_URL || 'https://withforma.io';
          const unsubUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&scope=${encodeURIComponent(id)}`;
          const personalizedContent = content
            .replace(/\{\{name\}\}/gi, recipientName || 'there')
            .replace(/\{\{email\}\}/gi, email);

          let emailSent = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              await resend.emails.send({
                from: fromEmail,
                replyTo,
                to: email,
                subject: subject.replace(/\{\{name\}\}/gi, recipientName || 'there'),
                html: buildBroadcastEmail(personalizedContent, senderName, workspace?.logoUrl, unsubUrl),
              });
              sent++;
              emailSent = true;
              break;
            } catch (err: unknown) {
              const isRateLimit = err instanceof Error && (err.message?.includes('rate limit') || err.message?.includes('429'));
              if (isRateLimit && attempt < 2) {
                await new Promise(r => setTimeout(r, 1500));
              } else {
                failed++;
                break;
              }
            }
          }

          // Throttle: 350ms between sends
          if (emailSent && i < recipientList.length - 1) {
            await new Promise(r => setTimeout(r, 350));
          }

          // Update progress every 10 emails
          if ((i + 1) % 10 === 0 || i === recipientList.length - 1) {
            await prisma.respondentBroadcast.update({
              where: { id: broadcast.id },
              data: { sentCount: sent, failedCount: failed },
            });
          }
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

// DELETE /api/workspaces/[id]/broadcasts - Delete a broadcast
export async function DELETE(
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

    const { broadcastId } = await request.json();
    if (!broadcastId) {
      return NextResponse.json({ error: 'broadcastId is required' }, { status: 400 });
    }

    await prisma.respondentBroadcast.delete({
      where: { id: broadcastId, workspaceId: id },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    return NextResponse.json({ error: 'Failed to delete broadcast' }, { status: 500 });
  }
}

function buildBroadcastEmail(content: string, senderName: string, logoUrl?: string | null, unsubscribeUrl?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1f2937;margin:0;padding:0;background-color:#ffffff;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="padding:0 0 24px;">
      ${logoUrl
        ? `<img src="${logoUrl}" alt="${senderName}" style="height:32px;display:block;" />`
        : `<div style="font-size:18px;font-weight:700;color:#1f2937;">${senderName}</div>`
      }
    </div>

    <!-- Content -->
    <div style="padding:0 0 32px;color:#374151;font-size:15px;line-height:1.7;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="padding:24px 0 0;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
      Sent by ${senderName} via <a href="https://withforma.io" style="color:#ef6f2e;text-decoration:none;"><img src="https://withforma.io/icon.svg" alt="Forma" width="14" height="14" style="display:inline-block;vertical-align:middle;margin-right:3px;" />Forma</a>
      ${unsubscribeUrl ? `<br><a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;font-size:11px;margin-top:4px;display:inline-block;">Unsubscribe</a>` : ''}
    </div>
  </div>
</body>
</html>`;
}
