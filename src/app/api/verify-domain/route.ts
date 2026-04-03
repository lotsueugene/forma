import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint is called by Caddy's on-demand TLS to verify
// that a domain is valid before issuing an SSL certificate.
// This prevents abuse where random domains could get certs.
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain');

  if (!domain) {
    return new NextResponse('Missing domain parameter', { status: 400 });
  }

  // Check if this domain is registered and verified in our system
  const customDomain = await prisma.customDomain.findUnique({
    where: { domain },
  });

  if (!customDomain) {
    return new NextResponse('Domain not found', { status: 404 });
  }

  // Only allow SSL for verified domains
  if (customDomain.status !== 'verified') {
    return new NextResponse('Domain not verified', { status: 403 });
  }

  // Domain is valid - Caddy can issue a certificate
  return new NextResponse('OK', { status: 200 });
}
