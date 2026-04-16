import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkApiRateLimit } from '@/lib/api-rate-limiter';

// POST /api/forms/[id]/tracking - Track field interactions for drop-off analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Rate limit by IP to prevent abuse (60 requests per minute per IP)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') || 'unknown';
    if (!checkApiRateLimit(`tracking:${ip}`, 60)) {
      return NextResponse.json({ success: true }); // Silent rate limit — don't break UX
    }

    const body = await request.json();
    const { fieldsInteracted, lastFieldId, completed } = body;

    // Validate input types
    if (lastFieldId && typeof lastFieldId !== 'string') {
      return NextResponse.json({ success: true });
    }
    if (fieldsInteracted && !Array.isArray(fieldsInteracted)) {
      return NextResponse.json({ success: true });
    }

    const form = await prisma.form.findUnique({
      where: { id },
      select: { id: true, settings: true },
    });

    if (!form) {
      return NextResponse.json({ success: true }); // Silent — don't reveal form existence
    }

    // Parse existing tracking data from settings or create new
    const settings = form.settings ? JSON.parse(form.settings) : {};
    const tracking = settings._tracking || { views: 0, starts: 0, dropOffs: {} };

    if (completed) {
      return NextResponse.json({ success: true });
    }

    // Track the start
    tracking.starts = (tracking.starts || 0) + 1;

    // Track which field they dropped off at
    if (lastFieldId && typeof lastFieldId === 'string') {
      tracking.dropOffs[lastFieldId] = (tracking.dropOffs[lastFieldId] || 0) + 1;
    }

    // Track fields interacted with (limit array size to prevent abuse)
    if (Array.isArray(fieldsInteracted)) {
      if (!tracking.fieldInteractions) tracking.fieldInteractions = {};
      for (const fieldId of fieldsInteracted.slice(0, 50)) {
        if (typeof fieldId === 'string') {
          tracking.fieldInteractions[fieldId] = (tracking.fieldInteractions[fieldId] || 0) + 1;
        }
      }
    }

    await prisma.form.update({
      where: { id },
      data: { settings: JSON.stringify({ ...settings, _tracking: tracking }) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true });
  }
}
