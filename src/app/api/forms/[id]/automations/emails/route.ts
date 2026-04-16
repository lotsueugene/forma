import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyFormAccess } from '@/lib/workspace-auth';

// GET /api/forms/[id]/automations/emails — List sent/scheduled emails
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await verifyFormAccess(session.user.id, id, 'editor');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    // Get automation IDs for this form
    const automations = await prisma.automation.findMany({
      where: { formId: id },
      select: { id: true, name: true },
    });

    const automationIds = automations.map(a => a.id);
    const automationNames = new Map(automations.map(a => [a.id, a.name]));

    const [emails, total] = await Promise.all([
      prisma.scheduledEmail.findMany({
        where: { automationId: { in: automationIds } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.scheduledEmail.count({
        where: { automationId: { in: automationIds } },
      }),
    ]);

    return NextResponse.json({
      emails: emails.map(e => ({
        id: e.id,
        to: e.to,
        subject: e.subject,
        status: e.status,
        scheduledFor: e.scheduledFor,
        sentAt: e.sentAt,
        createdAt: e.createdAt,
        automationName: automationNames.get(e.automationId) || 'Unknown',
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching automation emails:', error);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}

// DELETE /api/forms/[id]/automations/emails — Cancel/delete a scheduled email
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await verifyFormAccess(session.user.id, id, 'editor');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { emailId } = await request.json();

    if (!emailId || typeof emailId !== 'string') {
      return NextResponse.json({ error: 'Email ID required' }, { status: 400 });
    }

    // Verify the email belongs to an automation on this form
    const email = await prisma.scheduledEmail.findUnique({
      where: { id: emailId },
      select: { id: true, automation: { select: { formId: true } } },
    });

    if (!email || email.automation.formId !== id) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    await prisma.scheduledEmail.delete({
      where: { id: emailId },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting scheduled email:', error);
    return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 });
  }
}
