import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { resolveTxt, resolve4, resolveCname } from 'node:dns/promises';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';

// The server's IP address that custom domains should point to
const SERVER_IP = 'SERVER_IP_REDACTED';
const MAIN_DOMAIN = 'withforma.io';

export const runtime = 'nodejs';

// POST /api/workspaces/[id]/custom-domain/verify
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const customDomain = await prisma.customDomain.findUnique({
      where: { workspaceId: id },
    });
    if (!customDomain) {
      return NextResponse.json({ error: 'No custom domain configured' }, { status: 404 });
    }

    const host = `_forma-verification.${customDomain.domain}`;
    const records = await resolveTxt(host).catch(() => []);
    const flattened = records.map((r) => r.join(''));
    const valid = flattened.includes(customDomain.verificationToken);

    if (!valid) {
      return NextResponse.json(
        {
          verified: false,
          error: 'Verification TXT record not found yet',
          expectedHost: host,
          expectedValue: customDomain.verificationToken,
        },
        { status: 400 }
      );
    }

    // Check if domain points to our server (A record or CNAME)
    let pointsToServer = false;

    // Check A records
    try {
      const aRecords = await resolve4(customDomain.domain);
      if (aRecords.includes(SERVER_IP)) {
        pointsToServer = true;
      }
    } catch {
      // No A record, check CNAME
    }

    // Check CNAME records if A record didn't match
    if (!pointsToServer) {
      try {
        const cnameRecords = await resolveCname(customDomain.domain);
        if (cnameRecords.some(cname => cname === MAIN_DOMAIN || cname.endsWith(`.${MAIN_DOMAIN}`))) {
          pointsToServer = true;
        }
      } catch {
        // No CNAME record
      }
    }

    if (!pointsToServer) {
      return NextResponse.json(
        {
          verified: false,
          error: 'Domain does not point to our server. Please add an A record pointing to ' + SERVER_IP + ' or a CNAME pointing to ' + MAIN_DOMAIN,
          txtVerified: true,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.customDomain.update({
      where: { id: customDomain.id },
      data: {
        verifiedAt: new Date(),
        status: 'verified',
      },
    });

    return NextResponse.json({ verified: true, domain: updated });
  } catch (error) {
    console.error('Error verifying custom domain:', error);
    return NextResponse.json(
      { error: 'Failed to verify custom domain' },
      { status: 500 }
    );
  }
}

