import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/unsubscribe - Unsubscribe an email
export async function POST(request: NextRequest) {
  try {
    const { email, scope } = await request.json();

    if (!email || !scope) {
      return NextResponse.json({ error: 'Email and scope required' }, { status: 400 });
    }

    await prisma.emailUnsubscribe.upsert({
      where: { email_scope: { email: email.toLowerCase().trim(), scope } },
      update: {},
      create: { email: email.toLowerCase().trim(), scope },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}

// GET /api/unsubscribe?email=...&scope=... - Check if unsubscribed
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  const scope = request.nextUrl.searchParams.get('scope');

  if (!email || !scope) {
    return NextResponse.json({ error: 'Email and scope required' }, { status: 400 });
  }

  const record = await prisma.emailUnsubscribe.findUnique({
    where: { email_scope: { email: email.toLowerCase().trim(), scope } },
  });

  return NextResponse.json({ unsubscribed: !!record });
}
