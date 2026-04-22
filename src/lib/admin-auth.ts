/**
 * Admin authentication utilities
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkApiRateLimit } from '@/lib/api-rate-limiter';
import { isAccountLocked, recordFailedAttempt } from '@/lib/account-lockout';

export interface AdminSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

/**
 * Verify the current user is a platform admin
 * Returns the admin session if valid, null otherwise
 */
export async function verifyAdmin(): Promise<AdminSession | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  // Fetch user with role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user || user.role !== 'admin') {
    return null;
  }

  // Check if admin is locked out (too many rate limit hits)
  const adminLockKey = `admin:${user.id}`;
  const lockStatus = isAccountLocked(adminLockKey);
  if (lockStatus.locked) {
    return null;
  }

  // Rate limit admin requests (60 per minute per admin user)
  if (!checkApiRateLimit(adminLockKey, 60)) {
    // Record as failed attempt — 5 consecutive rate limit hits = lockout
    await recordFailedAttempt(`admin-abuse:${user.id}`, {
      email: user.email || undefined,
      userId: user.id,
    });
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email || '',
      name: user.name,
      role: user.role,
    },
  };
}

/**
 * Check if a user ID is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === 'admin';
}

/**
 * Promote a user to admin
 * REQUIRES: Caller must be verified as admin first
 * Also upgrades all their workspaces to Pro plan
 *
 * @param targetUserId - The user ID to promote
 * @param adminSession - The verified admin session performing this action
 * @throws Error if adminSession is not provided or invalid
 */
export async function promoteToAdmin(targetUserId: string, adminSession: AdminSession): Promise<void> {
  // Verify the caller is a valid admin
  if (!adminSession?.user?.id || adminSession.user.role !== 'admin') {
    throw new Error('Unauthorized: Only admins can promote users');
  }

  // Prevent self-promotion (though they're already admin if calling this)
  if (targetUserId === adminSession.user.id) {
    throw new Error('Cannot modify own admin status');
  }

  // Check if target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true },
  });

  if (!targetUser) {
    throw new Error('User not found');
  }

  if (targetUser.role === 'admin') {
    throw new Error('User is already an admin');
  }

  // Update user role to admin
  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: 'admin' },
  });

  // Log the action
  console.log(`[ADMIN AUDIT] User ${targetUserId} promoted to admin by ${adminSession.user.email} (${adminSession.user.id})`);

  // Get all workspaces where user is owner
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: targetUserId, role: 'owner' },
    select: { workspaceId: true },
  });

  // Upgrade all owned workspaces to Pro plan
  if (memberships.length > 0) {
    await prisma.subscription.updateMany({
      where: {
        workspaceId: { in: memberships.map(m => m.workspaceId) },
      },
      data: { plan: 'pro', status: 'active' },
    });
  }
}

/**
 * Demote an admin back to regular user
 * REQUIRES: Caller must be verified as admin first
 *
 * @param targetUserId - The user ID to demote
 * @param adminSession - The verified admin session performing this action
 * @throws Error if adminSession is not provided or invalid
 */
export async function demoteFromAdmin(targetUserId: string, adminSession: AdminSession): Promise<void> {
  // Verify the caller is a valid admin
  if (!adminSession?.user?.id || adminSession.user.role !== 'admin') {
    throw new Error('Unauthorized: Only admins can demote users');
  }

  // Prevent self-demotion
  if (targetUserId === adminSession.user.id) {
    throw new Error('Cannot demote yourself');
  }

  // Check if target user exists and is actually an admin
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true },
  });

  if (!targetUser) {
    throw new Error('User not found');
  }

  if (targetUser.role !== 'admin') {
    throw new Error('User is not an admin');
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: 'user' },
  });

  // Log the action
  console.log(`[ADMIN AUDIT] User ${targetUserId} demoted from admin by ${adminSession.user.email} (${adminSession.user.id})`);
}
