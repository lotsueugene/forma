import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/forms/[id]/bookings?fieldId=xxx
// Returns existing bookings grouped by date for availability checking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fieldId = request.nextUrl.searchParams.get('fieldId');

    // Find the form
    const form = await prisma.form.findFirst({
      where: { id, status: 'active' },
      select: { id: true },
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

      // Look for booking field data (either by fieldId or scan all fields)
      const bookingFields = fieldId ? [data[fieldId]] : Object.values(data);

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

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ bookings: {} });
  }
}
