import { NextResponse } from 'next/server';
import { getPlatformFeePercentage } from '@/lib/stripe';

// GET /api/platform/fee — Get platform fee percentage (public)
export async function GET() {
  try {
    const fee = await getPlatformFeePercentage();
    return NextResponse.json({ fee });
  } catch {
    return NextResponse.json({ fee: 5 });
  }
}
