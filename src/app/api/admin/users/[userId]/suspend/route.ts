import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';
import { auditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/api-rate-limit';

// POST /api/admin/users/[userId]/suspend — suspend a user account.
// Body: { reason?: string }. Suspended users cannot log in (credentials or
// OAuth). Existing JWTs remain valid until expiry (max 24h per auth config) —
// if you need an immediate hard cutoff, delete the user instead.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    if (userId === admin.user.id) {
      return NextResponse.json(
        { error: 'Cannot suspend yourself' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, suspendedAt: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (target.suspendedAt) {
      return NextResponse.json({ error: 'User is already suspended' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        suspendedAt: new Date(),
        suspendedReason: reason,
      },
      select: { id: true, email: true, name: true, suspendedAt: true, suspendedReason: true },
    });

    auditLog({
      action: 'admin.suspend_user',
      userId: admin.user.id,
      ip: getClientIp(request),
      resourceType: 'user',
      resourceId: user.id,
      details: { targetEmail: user.email, reason },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Admin user suspend error:', error);
    return NextResponse.json(
      { error: 'Failed to suspend user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[userId]/suspend — lift the suspension.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, suspendedAt: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!target.suspendedAt) {
      return NextResponse.json({ error: 'User is not suspended' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        suspendedAt: null,
        suspendedReason: null,
      },
      select: { id: true, email: true, name: true, suspendedAt: true },
    });

    auditLog({
      action: 'admin.unsuspend_user',
      userId: admin.user.id,
      ip: getClientIp(request),
      resourceType: 'user',
      resourceId: user.id,
      details: { targetEmail: user.email },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Admin user unsuspend error:', error);
    return NextResponse.json(
      { error: 'Failed to unsuspend user' },
      { status: 500 }
    );
  }
}
