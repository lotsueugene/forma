import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';
import { WELCOME_EMAIL_DEFAULTS } from '@/lib/email';

// Map known slugs to their code-defined defaults. When no DB row exists yet
// the GET endpoint returns the default so the editor is pre-populated rather
// than empty — admins are editing, not authoring from scratch.
const DEFAULTS: Record<string, { subject: string; body: string; description: string }> = {
  welcome: {
    ...WELCOME_EMAIL_DEFAULTS,
    description:
      'Sent once when a new user finishes signing up (credentials or OAuth). Placeholders: {{name}}, {{email}}.',
  },
};

// GET /api/admin/emails/[slug] — fetch the stored template, falling back to
// the code-defined default if no row has been saved yet.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const def = DEFAULTS[slug];
    if (!def) {
      return NextResponse.json({ error: 'Unknown template' }, { status: 404 });
    }

    const tpl = await prisma.emailTemplate.findUnique({ where: { slug } });

    return NextResponse.json({
      slug,
      description: def.description,
      subject: tpl?.subject ?? def.subject,
      body: tpl?.body ?? def.body,
      defaults: { subject: def.subject, body: def.body },
      updatedAt: tpl?.updatedAt ?? null,
      isCustomised: Boolean(tpl),
    });
  } catch (error) {
    console.error('Admin email template GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load template' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/emails/[slug] — upsert subject + body for this template.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    if (!DEFAULTS[slug]) {
      return NextResponse.json({ error: 'Unknown template' }, { status: 404 });
    }

    const { subject, body } = await request.json();
    if (typeof subject !== 'string' || typeof body !== 'string') {
      return NextResponse.json({ error: 'subject and body required' }, { status: 400 });
    }
    if (!subject.trim() || !body.trim()) {
      return NextResponse.json({ error: 'subject and body cannot be empty' }, { status: 400 });
    }
    if (subject.length > 200) {
      return NextResponse.json({ error: 'Subject is too long (max 200 chars)' }, { status: 400 });
    }
    if (body.length > 20000) {
      return NextResponse.json({ error: 'Body is too long (max 20000 chars)' }, { status: 400 });
    }

    const tpl = await prisma.emailTemplate.upsert({
      where: { slug },
      update: { subject, body, updatedBy: admin.user.id },
      create: { slug, subject, body, updatedBy: admin.user.id },
    });

    return NextResponse.json({
      slug: tpl.slug,
      subject: tpl.subject,
      body: tpl.body,
      updatedAt: tpl.updatedAt,
      isCustomised: true,
    });
  } catch (error) {
    console.error('Admin email template PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to save template' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/emails/[slug] — revert to the code-defined default by
// removing the DB row.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    if (!DEFAULTS[slug]) {
      return NextResponse.json({ error: 'Unknown template' }, { status: 404 });
    }

    await prisma.emailTemplate.deleteMany({ where: { slug } });

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Admin email template DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to reset template' },
      { status: 500 }
    );
  }
}
