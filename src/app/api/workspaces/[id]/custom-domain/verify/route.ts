import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { resolveTxt } from 'node:dns/promises';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';

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
    const access = await verifyWorkspaceAccess(session.user.id, id, 'admin');
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

