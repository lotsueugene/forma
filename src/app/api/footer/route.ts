import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/footer - Get active footer links (public)
export async function GET() {
  try {
    const links = await prisma.footerLink.findMany({
      where: { active: true },
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        section: true,
        label: true,
        href: true,
        external: true,
      },
    });

    // Group by section
    const grouped: Record<string, Array<{ label: string; href: string; external: boolean }>> = {};
    links.forEach((link) => {
      if (!grouped[link.section]) {
        grouped[link.section] = [];
      }
      grouped[link.section].push({
        label: link.label,
        href: link.href,
        external: link.external,
      });
    });

    return NextResponse.json({ links: grouped });
  } catch (error) {
    console.error('Error fetching footer links:', error);
    // Return default links on error
    return NextResponse.json({
      links: {
        product: [
          { label: 'Features', href: '/#features', external: false },
          { label: 'Pricing', href: '/#pricing', external: false },
        ],
        developers: [
          { label: 'Documentation', href: '/docs', external: false },
        ],
        company: [
          { label: 'Contact', href: '/contact', external: false },
        ],
        legal: [
          { label: 'Privacy', href: '/privacy', external: false },
          { label: 'Terms', href: '/terms', external: false },
        ],
      },
    });
  }
}
