import { prisma } from './prisma';
import type { WorkspaceMember, Form, Workspace } from '@prisma/client';

export type Role = 'owner' | 'manager' | 'editor' | 'viewer';

const roleHierarchy: Record<Role, number> = {
  owner: 4,
  manager: 3,
  editor: 2,
  viewer: 1,
};

export interface WorkspaceAccessResult {
  allowed: boolean;
  membership?: WorkspaceMember;
  workspace?: Workspace;
  error?: string;
}

export interface FormAccessResult {
  allowed: boolean;
  form?: Form & { workspace: Workspace };
  membership?: WorkspaceMember;
  error?: string;
}

/**
 * Verify that a user has access to a workspace with at least the specified role
 */
export async function verifyWorkspaceAccess(
  userId: string,
  workspaceId: string,
  minimumRole: Role = 'viewer'
): Promise<WorkspaceAccessResult> {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    include: {
      workspace: true,
    },
  });

  if (!membership) {
    return { allowed: false, error: 'Not a member of this workspace' };
  }

  const userRoleLevel = roleHierarchy[membership.role as Role] || 0;
  const requiredRoleLevel = roleHierarchy[minimumRole];

  if (userRoleLevel < requiredRoleLevel) {
    return { allowed: false, error: 'Insufficient permissions', membership };
  }

  return { allowed: true, membership, workspace: membership.workspace };
}

/**
 * Verify that a user has access to a form through workspace membership
 */
export async function verifyFormAccess(
  userId: string,
  formId: string,
  minimumRole: Role = 'viewer'
): Promise<FormAccessResult> {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: { workspace: true },
  });

  if (!form) {
    return { allowed: false, error: 'Form not found' };
  }

  const accessResult = await verifyWorkspaceAccess(userId, form.workspaceId, minimumRole);

  if (!accessResult.allowed) {
    return {
      allowed: false,
      error: accessResult.error,
      form,
    };
  }

  return {
    allowed: true,
    form,
    membership: accessResult.membership,
  };
}

/**
 * Get the default workspace for a user (personal workspace or first workspace)
 */
export async function getDefaultWorkspace(userId: string): Promise<Workspace | null> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { workspace: { isPersonal: 'desc' } },
  });

  return membership?.workspace || null;
}

/**
 * Get all workspaces a user is a member of
 */
export async function getUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: true,
    },
    orderBy: [
      { workspace: { isPersonal: 'desc' } },
      { workspace: { name: 'asc' } },
    ],
  });

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));
}

/**
 * Create a personal workspace for a user
 */
export async function createPersonalWorkspace(userId: string, userName?: string | null, userEmail?: string | null) {
  const displayName = userName || userEmail?.split('@')[0] || 'User';

  const workspace = await prisma.workspace.create({
    data: {
      name: `${displayName}'s Workspace`,
      slug: `personal-${userId}`,
      isPersonal: true,
      members: {
        create: {
          userId,
          role: 'owner',
        },
      },
    },
    include: {
      members: true,
    },
  });

  return workspace;
}

/**
 * Create a new workspace with the user as owner
 */
export async function createWorkspace(userId: string, name: string, slug: string) {
  // Check if slug is already taken
  const existing = await prisma.workspace.findUnique({
    where: { slug },
  });

  if (existing) {
    throw new Error('Workspace slug already taken');
  }

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      isPersonal: false,
      members: {
        create: {
          userId,
          role: 'owner',
        },
      },
    },
    include: {
      members: true,
    },
  });

  return workspace;
}

/**
 * Check if a role can perform an action based on minimum required role
 */
export function hasPermission(userRole: string, minimumRole: Role): boolean {
  const userRoleLevel = roleHierarchy[userRole as Role] || 0;
  const requiredRoleLevel = roleHierarchy[minimumRole];
  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  const names: Record<string, string> = {
    owner: 'Owner',
    manager: 'Manager',
    editor: 'Editor',
    viewer: 'Viewer',
  };
  return names[role] || role;
}
