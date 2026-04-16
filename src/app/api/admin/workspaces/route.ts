import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';
import { checkApiRateLimit } from '@/lib/api-rate-limiter';

// GET /api/admin/workspaces - List all workspaces
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

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { members: { some: { user: { email: { contains: search, mode: 'insensitive' as const } } } } },
          ],
        }
      : {};

    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          isPersonal: true,
          createdAt: true,
          logoUrl: true,
          members: {
            select: {
              role: true,
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          _count: {
            select: {
              forms: true,
              members: true,
            },
          },
        },
      }),
      prisma.workspace.count({ where }),
    ]);

    const formatted = workspaces.map((ws) => {
      const owner = ws.members.find((m) => m.role === 'owner');
      return {
        id: ws.id,
        name: ws.name,
        isPersonal: ws.isPersonal,
        createdAt: ws.createdAt,
        logoUrl: ws.logoUrl,
        owner: owner
          ? { id: owner.user.id, name: owner.user.name, email: owner.user.email }
          : null,
        formCount: ws._count.forms,
        memberCount: ws._count.members,
      };
    });

    return NextResponse.json({
      workspaces: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin workspaces error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}
