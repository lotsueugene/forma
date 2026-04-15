'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  DotsThree,
  MagnifyingGlass,
  EnvelopeSimple,
  Trash,
  PencilSimple,
  Crown,
  ShieldCheck,
  Eye,
  Spinner,
  ArrowsClockwise,
  SignOut,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useWorkspace } from '@/contexts/workspace-context';
import UpgradeModal from '@/components/dashboard/UpgradeModal';

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    name: string | null;
    email: string;
  };
}

interface WorkspaceSubscriptionSummary {
  canInviteMembers: boolean;
  features: { teamMembers: boolean };
}

const roleIcons = {
  owner: Crown,
  manager: ShieldCheck,
  editor: PencilSimple,
  viewer: Eye,
};

const roleColors = {
  owner: 'text-yellow-700 bg-yellow-100',
  manager: 'text-purple-400 bg-purple-400/10',
  editor: 'text-blue-400 bg-blue-400/10',
  viewer: 'text-gray-700 bg-neutral-400/10',
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email.substring(0, 2).toUpperCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      return 'Just now';
    }
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return '1 day ago';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export default function TeamPage() {
  const { data: session } = useSession();
  const { currentWorkspace } = useWorkspace();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<{
    message: string;
    showUpgrade: boolean;
  } | null>(null);
  const [subscriptionSummary, setSubscriptionSummary] =
    useState<WorkspaceSubscriptionSummary | null>(null);

  const fetchTeamData = useCallback(async () => {
    if (!currentWorkspace) return;

    setIsLoading(true);
    try {
      const [membersRes, invitationsRes, subscriptionRes] = await Promise.all([
        fetch(`/api/workspaces/${currentWorkspace.id}/members`),
        fetch(`/api/workspaces/${currentWorkspace.id}/invitations`),
        fetch(`/api/workspaces/${currentWorkspace.id}/subscription`),
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
      }

      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json();
        setInvitations(invitationsData.invitations || []);
      }

      if (subscriptionRes.ok) {
        const subJson = await subscriptionRes.json();
        const s = subJson.subscription as WorkspaceSubscriptionSummary;
        if (s?.features && typeof s.canInviteMembers === 'boolean') {
          setSubscriptionSummary({
            canInviteMembers: s.canInviteMembers,
            features: s.features,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching team data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleInvite = async () => {
    if (!currentWorkspace || !inviteEmail) return;

    setIsSubmitting(true);
    setInviteError(null);

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/invitations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        }
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setInviteError({
          message: data.error || 'Failed to send invitation',
          showUpgrade: response.status === 402,
        });
        return;
      }

      await fetchTeamData();
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('viewer');
    } catch (err) {
      setInviteError({
        message: err instanceof Error ? err.message : 'Failed to send invitation',
        showUpgrade: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!currentWorkspace) return;

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/members/${memberId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change role');
      }

      await fetchTeamData();
      setShowRoleModal(null);
      setMenuOpenId(null);
    } catch (err) {
      console.error('Error changing role:', err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentWorkspace) return;

    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/members/${memberId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      await fetchTeamData();
      setMenuOpenId(null);
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleTransferOwnership = async (memberId: string, memberName: string) => {
    if (!currentWorkspace) return;
    if (!confirm(`Transfer ownership to ${memberName}? You will become a manager.`)) return;

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/members/${memberId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'transfer_ownership' }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to transfer ownership');
      }

      await fetchTeamData();
      setMenuOpenId(null);
    } catch (err) {
      console.error('Error transferring ownership:', err);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!currentWorkspace) return;

    // Find current user's membership
    const myMembership = members.find(m => m.email === session?.user?.email);
    if (!myMembership) return;

    const isOwner = myMembership.role === 'owner';
    const message = isOwner
      ? 'You are the owner. Ownership will be transferred to the next member. Are you sure?'
      : 'Are you sure you want to leave this workspace?';

    if (!confirm(message)) return;

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/members/${myMembership.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to leave workspace');
        return;
      }

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Error leaving workspace:', err);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!currentWorkspace) return;

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/invitations/${invitationId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel invitation');
      }

      await fetchTeamData();
    } catch (err) {
      console.error('Error canceling invitation:', err);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!currentWorkspace) return;

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/invitations/${invitationId}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend invitation');
      }

      await fetchTeamData();
    } catch (err) {
      console.error('Error resending invitation:', err);
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      (member.name?.toLowerCase().includes(search.toLowerCase()) ||
        member.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const canManageTeam =
    currentWorkspace?.role === 'owner' || currentWorkspace?.role === 'manager';

  const inviteBlockedByPlan =
    canManageTeam &&
    subscriptionSummary !== null &&
    !subscriptionSummary.canInviteMembers;

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} className="animate-spin text-gray-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
          <p className="text-gray-600">
            {members.length} member{members.length !== 1 ? 's' : ''}{' '}
            {invitations.length > 0 && `/ ${invitations.length} pending invite${invitations.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManageTeam && (
          <button
            type="button"
            onClick={() => {
              if (inviteBlockedByPlan) {
                setShowUpgradeModal(true);
                return;
              }
              setInviteError(null);
              setShowInviteModal(true);
            }}
            className="btn btn-primary w-fit"
          >
            <Plus size={18} weight="bold" />
            Invite Member
          </button>
        )}
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Team collaboration"
      />

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlass
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team members..."
          className="input input-with-icon"
        />
      </div>

      {/* Team Members */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-medium text-gray-900">Active Members</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No members found
            </div>
          ) : (
            filteredMembers.map((member, index) => {
              const RoleIcon = roleIcons[member.role as keyof typeof roleIcons] || Eye;
              const roleColor = roleColors[member.role as keyof typeof roleColors] || roleColors.viewer;
              const isOwner = member.role === 'owner';

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-accent-100 to-accent-200 flex items-center justify-center text-gray-900 font-semibold text-sm flex-shrink-0">
                      {getInitials(member.name, member.email)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {member.name || member.email}
                      </div>
                      {member.name && (
                        <div className="text-sm text-gray-600 truncate">{member.email}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
                    <div className="w-20 sm:w-24 flex justify-end">
                      <div
                        className={cn(
                          'inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium capitalize',
                          roleColor
                        )}
                      >
                        <RoleIcon size={12} className="sm:hidden" />
                        <RoleIcon size={14} className="hidden sm:block" />
                        <span className="hidden sm:inline">{member.role}</span>
                      </div>
                    </div>

                    <div className="hidden lg:block text-sm text-gray-600 w-28">
                      Joined {formatDate(member.createdAt)}
                    </div>

                    {canManageTeam && !isOwner && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setMenuOpenId(menuOpenId === member.id ? null : member.id)
                          }
                          className="p-1.5 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100"
                        >
                          <DotsThree size={20} weight="bold" />
                        </button>

                        <AnimatePresence>
                          {menuOpenId === member.id && (
                            <>
                              {/* Backdrop to close menu when clicking outside */}
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpenId(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden z-20"
                              >
                                <button
                                  onClick={() => setShowRoleModal(member.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                                >
                                  <PencilSimple size={16} />
                                  Change Role
                                </button>
                                {currentWorkspace?.role === 'owner' && (
                                  <button
                                    onClick={() => handleTransferOwnership(member.id, member.name || member.email)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                                  >
                                    <ArrowsClockwise size={16} />
                                    Transfer Ownership
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-gray-100"
                                >
                                  <Trash size={16} />
                                  Remove Member
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>

                        {/* Change Role Modal */}
                        <AnimatePresence>
                          {showRoleModal === member.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                              onClick={() => setShowRoleModal(null)}
                            >
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-xl"
                              >
                                <div className="p-4 border-b border-gray-200">
                                  <h3 className="font-semibold text-gray-900">
                                    Change Role
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {member.name || member.email}
                                  </p>
                                </div>
                                <div className="p-2">
                                  {['manager', 'editor', 'viewer'].map((role) => (
                                    <button
                                      key={role}
                                      onClick={() => handleChangeRole(member.id, role)}
                                      className={cn(
                                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg capitalize',
                                        member.role === role
                                          ? 'bg-accent-100/10 text-accent-100'
                                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                                      )}
                                    >
                                      {role}
                                      {member.role === role && (
                                        <span className="ml-auto text-xs">(current)</span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                                <div className="p-4 border-t border-gray-200">
                                  <button
                                    onClick={() => setShowRoleModal(null)}
                                    className="btn btn-secondary w-full"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Pending Invites */}
      {invitations.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Pending Invites</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {invitations.map((invite, index) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                    <EnvelopeSimple size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{invite.email}</div>
                    <div className="text-sm text-gray-600">
                      Invited as <span className="capitalize">{invite.role}</span> / Sent{' '}
                      {formatDate(invite.createdAt)}
                    </div>
                  </div>
                </div>

                {canManageTeam && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResendInvitation(invite.id)}
                      className="btn btn-ghost text-sm"
                    >
                      Resend
                    </button>
                    <button
                      onClick={() => handleCancelInvitation(invite.id)}
                      className="btn btn-ghost text-red-600 hover:text-red-700 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Roles Legend */}
      <div className="card p-4 sm:p-6">
        <h2 className="font-medium text-gray-900 mb-4">Role Permissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              role: 'owner',
              description: 'Full access to all features, billing, and team management',
            },
            {
              role: 'manager',
              description: 'Manage forms, submissions, integrations, and team members',
            },
            {
              role: 'editor',
              description: 'Create and edit forms, view submissions, no team access',
            },
            {
              role: 'viewer',
              description: 'View forms and submissions only, no editing capabilities',
            },
          ].map((item) => {
            const RoleIcon = roleIcons[item.role as keyof typeof roleIcons];
            return (
              <div key={item.role} className="p-4 bg-gray-50 rounded-lg">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2 capitalize bg-gray-100 text-gray-700"
                >
                  <RoleIcon size={14} />
                  {item.role}
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leave Workspace */}
      {!currentWorkspace?.isPersonal && (
        <div className="flex items-center justify-between p-4 sm:p-6 rounded-xl border border-red-200 bg-red-50">
          <div>
            <p className="text-sm font-medium text-gray-900">Leave Workspace</p>
            <p className="text-xs text-gray-500">
              {currentWorkspace?.role === 'owner'
                ? 'Ownership will be transferred to the next member'
                : 'You will lose access to this workspace'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLeaveWorkspace}
            className="btn text-sm text-red-600 border border-red-300 hover:bg-red-100 flex items-center gap-1.5"
          >
            <SignOut size={14} />
            Leave
          </button>
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => {
              setShowInviteModal(false);
              setInviteError(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-xl"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Invite Team Member
                </h2>
                <p className="text-sm text-gray-600">
                  Send an invitation to join your team
                </p>
              </div>
              <div className="p-6 space-y-4">
                {inviteError && (
                  <div
                    className={cn(
                      'p-3 rounded-lg text-sm space-y-2',
                      inviteError.showUpgrade
                        ? 'bg-amber-500/10 border border-amber-500/25 text-amber-800'
                        : 'bg-red-500/10 border border-red-500/20 text-red-600'
                    )}
                  >
                    <p>{inviteError.message}</p>
                    {inviteError.showUpgrade && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-1">
                        <Link
                          href="/dashboard/settings?tab=billing#plans"
                          scroll={false}
                          className="inline-flex font-medium text-amber-800 hover:underline"
                          onClick={() => setShowInviteModal(false)}
                        >
                          View Plans
                        </Link>
                        <Link
                          href="/dashboard/settings?tab=billing#pro-monthly"
                          scroll={false}
                          className="inline-flex font-semibold text-accent-100 hover:underline"
                          onClick={() => setShowInviteModal(false)}
                        >
                          Upgrade to Pro
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                <div className="form-field">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="input"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="input"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError(null);
                    setInviteEmail('');
                    setInviteRole('viewer');
                  }}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  className="btn btn-primary"
                  disabled={isSubmitting || !inviteEmail}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Invite'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
