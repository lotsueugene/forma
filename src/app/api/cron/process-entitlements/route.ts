import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { processPendingEntitlementEvents } from '@/lib/entitlement-events';
import { syncExpiredEntitlements } from '@/lib/entitlements';

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

// GET /api/cron/process-entitlements?key=SECRET
// Keeps the entitlement outbox moving and marks expired rows for reporting.
// Runtime access decisions do not depend on this endpoint.
export async function GET(request: NextRequest) {
  const cronKey = request.nextUrl.searchParams.get('key');
  const expected = process.env.CRON_SECRET;
  if (!expected || !cronKey || !safeEqual(cronKey, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const expired = await syncExpiredEntitlements();
    const events = await processPendingEntitlementEvents();

    return NextResponse.json({
      success: true,
      expired: expired.expired,
      processedEvents: events.processed,
    });
  } catch (error) {
    console.error('Error processing entitlement events:', error);
    return NextResponse.json(
      { error: 'Failed to process entitlements' },
      { status: 500 }
    );
  }
}
