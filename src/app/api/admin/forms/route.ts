import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';
import { checkApiRateLimit } from '@/lib/api-rate-limiter';

// GET /api/admin/forms - List all forms (metadata only, no submission content)
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkApiRateLimit(`admin:${admin.user.id}`, 30)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { workspace: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [forms, total] = await Promise.all([
      prisma.form.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          formType: true,
          createdAt: true,
          updatedAt: true,
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { submissions: true },
          },
        },
      }),
      prisma.form.count({ where }),
    ]);

    const formatted = forms.map((form) => ({
      id: form.id,
      name: form.name,
      status: form.status,
      formType: form.formType,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      workspace: form.workspace,
      submissionCount: form._count.submissions,
    }));

    return NextResponse.json({
      forms: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin forms error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}
