import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Forma <support@withforma.io>';

// GET /api/admin/broadcasts/replies/[id] - Get single reply
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const reply = await prisma.broadcastReply.findUnique({
      where: { id },
      include: {
        broadcast: {
          select: {
            id: true,
            subject: true,
            content: true,
          },
        },
      },
    });

    if (!reply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    // Mark as read if unread
    if (reply.status === 'unread') {
      await prisma.broadcastReply.update({
        where: { id },
        data: { status: 'read', readAt: new Date() },
      });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Admin get reply error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reply' },
      { status: 500 }
    );
  }
}

// POST /api/admin/broadcasts/replies/[id] - Respond to a reply
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Response content is required' },
        { status: 400 }
      );
    }

    const reply = await prisma.broadcastReply.findUnique({
      where: { id },
      include: {
        broadcast: {
          select: { subject: true },
        },
      },
    });

    if (!reply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    // Generate response email HTML
    const html = generateResponseHtml(content, reply.fromName || 'there');

    // Determine subject
    const subject = reply.subject.startsWith('Re:')
      ? reply.subject
      : `Re: ${reply.subject}`;

    // Send the response email
    await resend.emails.send({
      from: EMAIL_FROM,
      to: reply.fromEmail,
      subject,
      html,
      text: content,
    });

    // Update reply record
    await prisma.broadcastReply.update({
      where: { id },
      data: {
        status: 'replied',
        repliedAt: new Date(),
        replyContent: content,
        repliedBy: admin.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin respond to reply error:', error);
    return NextResponse.json(
      { error: 'Failed to send response' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/broadcasts/replies/[id] - Delete a reply
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.broadcastReply.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete reply error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reply' },
      { status: 500 }
    );
  }
}

function generateResponseHtml(content: string, userName: string): string {
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
        <a href="https://withforma.io" style="color: #ef6f2e; text-decoration: none;">Forma</a> — The modern way to build forms
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
