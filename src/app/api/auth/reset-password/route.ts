import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkApiRateLimit } from '@/lib/api-rate-limiter';
import { isAccountLocked, recordFailedAttempt } from '@/lib/account-lockout';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// POST /api/auth/reset-password — Reset password with token
export async function POST(request: NextRequest) {
  try {
    const fwd = request.headers.get('x-forwarded-for');
    const ip = fwd ? fwd.split(',').map(s => s.trim()).pop()! : 'unknown';

    // Check lockout
    const lockKey = `reset:${ip}`;
    const lockStatus = isAccountLocked(lockKey);
    if (lockStatus.locked) {
      const mins = Math.ceil(lockStatus.remainingMs / 60000);
      return NextResponse.json({ error: `Too many attempts. Try again in ${mins} minutes.` }, { status: 429 });
    }

    if (!checkApiRateLimit(lockKey, 5)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters with uppercase, lowercase, and a number' },
        { status: 400 }
      );
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find and validate the token
    const storedToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email.toLowerCase().trim(),
        token: hashedToken,
        expires: { gt: new Date() }, // Not expired
      },
    });

    if (!storedToken) {
      await recordFailedAttempt(lockKey, { ip });
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid reset link' }, { status: 400 });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the used token (one-time use)
    await prisma.verificationToken.deleteMany({
      where: { identifier: email.toLowerCase().trim() },
    });

    const { auditLog } = await import('@/lib/audit');
    auditLog({ action: 'auth.password_reset_completed', userId: user.id, ip });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
