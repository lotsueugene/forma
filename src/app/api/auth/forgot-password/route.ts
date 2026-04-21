import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkApiRateLimit } from '@/lib/api-rate-limiter';
import crypto from 'crypto';

// POST /api/auth/forgot-password — Send password reset email
export async function POST(request: NextRequest) {
  try {
    const fwd = request.headers.get('x-forwarded-for');
    const ip = fwd ? fwd.split(',').map(s => s.trim()).pop()! : 'unknown';

    // Strict rate limit: 3 per hour per IP
    if (!checkApiRateLimit(`forgot:${ip}`, 3)) {
      // Always return success to prevent enumeration
      return NextResponse.json({ success: true });
    }

    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: true }); // Don't reveal validation errors
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, name: true, password: true },
    });

    // Always return success — don't reveal if email exists
    if (!user || !user.password) {
      // User doesn't exist or uses OAuth — return success anyway
      return NextResponse.json({ success: true });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store in VerificationToken table (reuse NextAuth's table)
    // Delete any existing tokens for this email first
    await prisma.verificationToken.deleteMany({
      where: { identifier: email.toLowerCase().trim() },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase().trim(),
        token: hashedToken,
        expires: expiresAt,
      },
    });

    // Send email
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email.toLowerCase().trim())}`;

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Forma <noreply@withforma.io>',
        to: email.toLowerCase().trim(),
        subject: 'Reset your Forma password',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Reset your password</h2>
            <p style="color: #4b5563; margin-bottom: 24px;">
              Click the button below to reset your password. This link expires in 15 minutes.
            </p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #ef6f2e; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Reset Password
            </a>
            <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't expose email sending failure
    }

    const { auditLog } = await import('@/lib/audit');
    auditLog({ action: 'auth.password_reset_requested', userId: user.id, ip });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: true }); // Always success
  }
}
