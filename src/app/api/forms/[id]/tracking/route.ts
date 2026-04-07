import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/forms/[id]/tracking - Track field interactions for drop-off analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { fieldsInteracted, lastFieldId, completed } = await request.json();

    // Store as a lightweight analytics event
    // We use the form's metadata to track drop-off stats
    const form = await prisma.form.findUnique({
      where: { id },
      select: { id: true, settings: true },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Parse existing tracking data from settings or create new
    const settings = form.settings ? JSON.parse(form.settings) : {};
    const tracking = settings._tracking || { views: 0, starts: 0, dropOffs: {} };

    if (completed) {
      // Don't track completed submissions as drop-offs
      return NextResponse.json({ success: true });
    }

    // Track the start
    tracking.starts = (tracking.starts || 0) + 1;

    // Track which field they dropped off at
    if (lastFieldId) {
      tracking.dropOffs[lastFieldId] = (tracking.dropOffs[lastFieldId] || 0) + 1;
    }

    // Track fields interacted with
    if (Array.isArray(fieldsInteracted)) {
      if (!tracking.fieldInteractions) tracking.fieldInteractions = {};
      for (const fieldId of fieldsInteracted) {
        tracking.fieldInteractions[fieldId] = (tracking.fieldInteractions[fieldId] || 0) + 1;
      }
    }

    // Save back (non-blocking, best effort)
    await prisma.form.update({
      where: { id },
      data: { settings: JSON.stringify({ ...settings, _tracking: tracking }) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silently fail — tracking should never break the user experience
    return NextResponse.json({ success: true });
  }
}
