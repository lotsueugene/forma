import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/admin/blog/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    // Handle publish state change
    let publishedAt = undefined;
    if (body.published !== undefined) {
      const currentPost = await prisma.blogPost.findUnique({ where: { id } });
      if (body.published && !currentPost?.published) {
        publishedAt = new Date();
      } else if (!body.published) {
        publishedAt = null;
      }
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...(body.slug !== undefined && { slug: body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-') }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.excerpt !== undefined && { excerpt: body.excerpt }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
        ...(body.author !== undefined && { author: body.author }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle }),
        ...(body.metaDesc !== undefined && { metaDesc: body.metaDesc }),
        ...(body.published !== undefined && { published: body.published }),
        ...(publishedAt !== undefined && { publishedAt }),
        ...(body.featured !== undefined && { featured: body.featured }),
      },
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE /api/admin/blog/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    await prisma.blogPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
