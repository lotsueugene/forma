import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/footer - Get all footer links and settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const links = await prisma.footerLink.findMany({
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
    });

    const settings = await prisma.siteSetting.findMany({
      where: {
        key: { startsWith: 'footer_' },
      },
    });

    // Convert settings to object
    const settingsObj: Record<string, string> = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    return NextResponse.json({ links, settings: settingsObj });
  } catch (error) {
    console.error('Error fetching footer data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch footer data' },
      { status: 500 }
    );
  }
}

// POST /api/admin/footer - Create a new footer link
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
    const { section, label, href, external, sortOrder, active } = body;

    if (!section || !label || !href) {
      return NextResponse.json(
        { error: 'Section, label, and href are required' },
        { status: 400 }
      );
    }

    const link = await prisma.footerLink.create({
      data: {
        section,
        label,
        href,
        external: external ?? false,
        sortOrder: sortOrder ?? 0,
        active: active ?? true,
      },
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    console.error('Error creating footer link:', error);
    return NextResponse.json(
      { error: 'Failed to create footer link' },
      { status: 500 }
    );
  }
}
