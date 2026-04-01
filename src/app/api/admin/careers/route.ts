import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/careers - Get all job postings
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

    const jobs = await prisma.jobPosting.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

// POST /api/admin/careers - Create a new job posting
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
    const {
      slug,
      title,
      department,
      location,
      type,
      description,
      requirements,
      benefits,
      salary,
      applyUrl,
      applyEmail,
      published,
      featured,
    } = body;

    if (!slug || !title || !department || !location || !type) {
      return NextResponse.json(
        { error: 'Slug, title, department, location, and type are required' },
        { status: 400 }
      );
    }

    const job = await prisma.jobPosting.create({
      data: {
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        title,
        department,
        location,
        type,
        description: description || '',
        requirements,
        benefits,
        salary,
        applyUrl,
        applyEmail,
        published: published ?? false,
        publishedAt: published ? new Date() : null,
        featured: featured ?? false,
      },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating job:', error);
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A job with this slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
