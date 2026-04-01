/**
 * Admin authentication utilities
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
 * Promote a user to admin (use with caution!)
 * Also upgrades all their workspaces to Pro plan
 */
export async function promoteToAdmin(userId: string): Promise<void> {
  // Update user role to admin
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'admin' },
  });

  // Get all workspaces where user is owner
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, role: 'owner' },
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
 */
export async function demoteFromAdmin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'user' },
  });
}
