import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createFormChallenge } from '@/lib/form-challenge';
import { apiRateLimit, getClientIp } from '@/lib/api-rate-limit';

function corsHeaders(request?: NextRequest): Record<string, string> {
  const origin = request?.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

/**
 * POST /api/forms/[id]/challenge
 * Public: issue a short-lived token that HTML/hosted forms attach to submissions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const headers = corsHeaders(request);
  try {
    const { id } = await params;
    const ip = getClientIp(request);
    const limited = apiRateLimit(ip, 'submission');
    if (!limited.allowed) {
      const retryHeaders = new Headers(headers);
      if (limited.retryAfter) {
        retryHeaders.set('Retry-After', String(limited.retryAfter));
      }
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: retryHeaders }
      );
    }

    const form = await prisma.form.findFirst({
      where: { id, status: 'active' },
      select: { id: true },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found or not active' },
        { status: 404, headers }
      );
    }

    const token = createFormChallenge(form.id);
    return NextResponse.json(
      { token, expiresIn: 1800 },
      {
        headers: {
          ...headers,
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Error issuing form challenge:', error);
    return NextResponse.json(
      { error: 'Failed to issue verification token' },
      { status: 500, headers }
    );
  }
}
