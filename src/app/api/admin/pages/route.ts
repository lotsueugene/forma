import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/pages - Get all pages
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pages = await prisma.page.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}

// POST /api/admin/pages - Create a new page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { slug, title, content, metaTitle, metaDesc, published } = body;

    if (!slug || !title) {
      return NextResponse.json({ error: 'Slug and title are required' }, { status: 400 });
    }

    const page = await prisma.page.create({
      data: {
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        title,
        content: content || '',
        metaTitle,
        metaDesc,
        published: published ?? false,
        publishedAt: published ? new Date() : null,
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating page:', error);
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A page with this slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}
