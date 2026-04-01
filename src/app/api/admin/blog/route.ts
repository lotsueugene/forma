import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/blog - Get all blog posts
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

    const posts = await prisma.blogPost.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST /api/admin/blog - Create a new blog post
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
    const { slug, title, excerpt, content, coverImage, author, tags, metaTitle, metaDesc, published, featured } = body;

    if (!slug || !title) {
      return NextResponse.json({ error: 'Slug and title are required' }, { status: 400 });
    }

    const post = await prisma.blogPost.create({
      data: {
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        title,
        excerpt,
        content: content || '',
        coverImage,
        author,
        tags,
        metaTitle,
        metaDesc,
        published: published ?? false,
        publishedAt: published ? new Date() : null,
        featured: featured ?? false,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating post:', error);
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
