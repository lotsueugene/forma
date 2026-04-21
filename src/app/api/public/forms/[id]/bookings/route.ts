import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkApiRateLimit } from '@/lib/api-rate-limiter';

// GET /api/public/forms/[id]/bookings?fieldId=xxx
// Returns existing bookings grouped by date for availability checking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkApiRateLimit(`bookings:${ip}`, 60)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const fieldId = request.nextUrl.searchParams.get('fieldId');

    // Find the form
    const form = await prisma.form.findFirst({
      where: { id, status: 'active' },
      select: { id: true, fields: true },
    });

    if (!form) {
      return NextResponse.json({ bookings: {} });
    }

    // Fetch all submissions for this form
    const submissions = await prisma.submission.findMany({
      where: { formId: id },
      select: { data: true },
      orderBy: { createdAt: 'desc' },
    });

    // Extract booking data and group by date
    const bookings: Record<string, Array<{ start: string; end: string }>> = {};

    for (const sub of submissions) {
      const data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;

      // Only extract from identified booking fields — never scan all fields
      // to prevent leaking non-booking data
      const formFields = form.fields ? (typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields) : [];
      const bookingFieldIds = fieldId ? [fieldId] : formFields
        .filter((f: { type: string }) => f.type === 'booking')
        .map((f: { id: string }) => f.id);
      const bookingFields = bookingFieldIds.map((fid: string) => data[fid]);

      for (const fieldValue of bookingFields) {
        if (!fieldValue) continue;

        let parsed = fieldValue;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch { continue; }
        }

        if (parsed && typeof parsed === 'object' && parsed.date && Array.isArray(parsed.slots)) {
          const date = parsed.date as string;
          if (!bookings[date]) bookings[date] = [];
          for (const slot of parsed.slots) {
            if (slot.start && slot.end) {
              bookings[date].push({ start: slot.start, end: slot.end });
            }
          }
        }
      }
    }

    // Fetch owner-set blocked times
    const blocks = await prisma.bookingBlock.findMany({
      where: {
        formId: id,
        ...(fieldId ? { fieldId } : {}),
      },
      select: { date: true, startTime: true, endTime: true },
    });

    // Group blocks by date
    const blockedDates: string[] = [];
    const blockedSlots: Record<string, Array<{ start: string; end: string }>> = {};

    for (const block of blocks) {
      if (!block.startTime || !block.endTime) {
        // Whole day blocked
        blockedDates.push(block.date);
      } else {
        // Specific time range blocked — treat like a booking
        if (!bookings[block.date]) bookings[block.date] = [];
        bookings[block.date].push({ start: block.startTime, end: block.endTime });
        if (!blockedSlots[block.date]) blockedSlots[block.date] = [];
        blockedSlots[block.date].push({ start: block.startTime, end: block.endTime });
      }
    }

    return NextResponse.json({ bookings, blockedDates, blockedSlots });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ bookings: {}, blockedDates: [], blockedSlots: {} });
  }
}
