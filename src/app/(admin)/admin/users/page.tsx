'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  MagnifyingGlass,
  Spinner,
  Shield,
  User as UserIcon,
  Trash,
  DotsThreeVertical,
  Crown,
  Clock,
  ArrowClockwise,
  X,
} from '@phosphor-icons/react';
import Pagination from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  workspaceCount: number;
  premium: {
    active: boolean;
    entitlementId: string | null;
    startsAt: string | null;
    expiresAt: string | null;
  };
  subscription: {
    plan: string;
    status: string;
    trialEndsAt: string | null;
    renewsAt: string | null;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Actor {
  id: string;
  name: string | null;
  email: string | null;
}

interface EntitlementRecord {
  id: string;
  userId: string;
  type: string;
  status: 'active' | 'expired' | 'revoked' | 'scheduled';
  storedStatus: string;
  startsAt: string;
  expiresAt: string | null;
  grantedAt: string;
  grantedBy: string | null;
  grantedByUser: Actor | null;
  grantReason: string;
  source: string;
  metadata: unknown;
  revokedAt: string | null;
  revokedBy: string | null;
  revokedByUser: Actor | null;
}

interface EntitlementHistoryItem {
  id: string;
  entitlementId: string | null;
  action: string;
  actor: Actor | null;
  source: string;
  reason: string | null;
  createdAt: string;
}

interface EntitlementEventRecord {
  id: string;
  entitlementId: string | null;
  type: string;
  status: string;
  attempts: number;
  lastError: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface EntitlementDetails {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    createdAt: string;
  };
  premium: {
    active: boolean;
    entitlementId: string | null;
    startsAt: string | null;
    expiresAt: string | null;
    status: 'active' | 'expired' | 'revoked' | 'scheduled';
    source: string | null;
    reason: string | null;
  };
  entitlements: EntitlementRecord[];
  history: EntitlementHistoryItem[];
  events: EntitlementEventRecord[];
}

const GRANT_OPTIONS = [
  { value: '1d', label: '1 day' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
  { value: '14d', label: '14 days' },
  { value: '30d', label: '30 days' },
  { value: '3mo', label: '3 months' },
  { value: '6mo', label: '6 months' },
  { value: '1y', label: '1 year' },
  { value: 'custom', label: 'Custom date' },
  { value: 'permanent', label: 'Permanent' },
];

const EXTEND_OPTIONS = GRANT_OPTIONS.filter((option) => option.value !== 'permanent');

function optionLabel(value: string) {
  return GRANT_OPTIONS.find((option) => option.value === value)?.label || value;
}

function formatDateTime(value: string | null) {
  if (!value) return 'No expiration';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRemaining(value: string | null) {
  if (!value) return 'Permanent';
  const ms = new Date(value).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} remaining`;
  const hours = Math.max(1, Math.ceil(ms / 3600000));
  return `${hours} hour${hours === 1 ? '' : 's'} remaining`;
}

function actorLabel(actor: Actor | null, fallback?: string | null) {
  if (actor?.email) return actor.email;
  if (actor?.name) return actor.name;
  return fallback || 'System';
}

function statusBadgeClass(status: string) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700';
  if (status === 'scheduled') return 'bg-blue-100 text-blue-700';
  if (status === 'revoked') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

function newIdempotencyKey(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [entitlementDetails, setEntitlementDetails] = useState<EntitlementDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [grantPreset, setGrantPreset] = useState('7d');
  const [grantCustomDate, setGrantCustomDate] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [grantInternalNote, setGrantInternalNote] = useState('');
  const [extendPreset, setExtendPreset] = useState('7d');
  const [extendCustomDate, setExtendCustomDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'default';
    onConfirm: () => Promise<void>;
    requireTypedConfirmation?: string;
    typedConfirmationLabel?: string;
  } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load users');
      }

      setUsers(data.users || []);
      setPagination((current) => data.pagination || current);
    } catch (error) {
      console.error('Failed to load users:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const loadEntitlementDetails = useCallback(async (userId: string) => {
    setDetailsLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/entitlements`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load Premium details');
      }
      setEntitlementDetails(data);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to load Premium details');
      setEntitlementDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const openPremiumPanel = (user: User) => {
    setSelectedUser(user);
    setGrantPreset('7d');
    setGrantCustomDate('');
    setGrantReason('');
    setGrantInternalNote('');
    setExtendPreset('7d');
    setExtendCustomDate('');
    setExtendReason('');
    setRevokeReason('');
    setActionError(null);
    loadEntitlementDetails(user.id);
  };

  const closePremiumPanel = () => {
    setSelectedUser(null);
    setEntitlementDetails(null);
    setActionError(null);
  };

  const refreshEntitlements = async () => {
    if (!selectedUser) return;
    await loadEntitlementDetails(selectedUser.id);
    await loadUsers();
  };

  const submitGrantPremium = async (idempotencyKey: string) => {
    if (!selectedUser) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/entitlements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'premium',
          preset: grantPreset,
          expiresAt: grantPreset === 'custom' ? grantCustomDate : null,
          reason: grantReason,
          internalNote: grantInternalNote,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grant Premium');
      setGrantReason('');
      setGrantInternalNote('');
      await refreshEntitlements();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to grant Premium');
    }
  };

  const queueGrantPremium = () => {
    if (!selectedUser) return;
    if (!grantReason.trim()) {
      setActionError('Enter a reason before granting Premium.');
      return;
    }
    if (grantPreset === 'custom' && !grantCustomDate) {
      setActionError('Choose a custom expiration date.');
      return;
    }
    const label = grantPreset === 'custom'
      ? `until ${formatDateTime(`${grantCustomDate}T23:59:59.999`)}`
      : optionLabel(grantPreset);
    const key = newIdempotencyKey('admin-grant-premium');
    setConfirmAction({
      title: 'Grant Premium',
      message: `Grant Premium to ${selectedUser.email || selectedUser.id} for ${label}?`,
      confirmText: 'Grant',
      variant: 'default',
      onConfirm: async () => submitGrantPremium(key),
    });
  };

  const currentEntitlement = entitlementDetails?.entitlements.find(
    (item) => item.id === entitlementDetails.premium.entitlementId
  ) || entitlementDetails?.entitlements.find((item) => item.status === 'active') || null;

  const submitExtendPremium = async (idempotencyKey: string) => {
    if (!currentEntitlement) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/entitlements/${currentEntitlement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: extendPreset,
          expiresAt: extendPreset === 'custom' ? extendCustomDate : null,
          reason: extendReason,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend Premium');
      setExtendReason('');
      await refreshEntitlements();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to extend Premium');
    }
  };

  const queueExtendPremium = () => {
    if (!currentEntitlement) return;
    if (!extendReason.trim()) {
      setActionError('Enter a reason before extending Premium.');
      return;
    }
    if (extendPreset === 'custom' && !extendCustomDate) {
      setActionError('Choose a custom expiration date.');
      return;
    }
    const label = extendPreset === 'custom'
      ? `until ${formatDateTime(`${extendCustomDate}T23:59:59.999`)}`
      : optionLabel(extendPreset);
    const key = newIdempotencyKey('admin-extend-premium');
    setConfirmAction({
      title: 'Extend Premium',
      message: `Extend Premium for ${selectedUser?.email || currentEntitlement.userId} by ${label}?`,
      confirmText: 'Extend',
      variant: 'default',
      onConfirm: async () => submitExtendPremium(key),
    });
  };

  const submitRevokePremium = async (idempotencyKey: string) => {
    if (!currentEntitlement) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/entitlements/${currentEntitlement.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: revokeReason,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke Premium');
      setRevokeReason('');
      await refreshEntitlements();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to revoke Premium');
    }
  };

  const queueRevokePremium = () => {
    if (!currentEntitlement) return;
    if (!revokeReason.trim()) {
      setActionError('Enter a reason before revoking Premium.');
      return;
    }
    const key = newIdempotencyKey('admin-revoke-premium');
    setConfirmAction({
      title: 'Revoke Premium',
      message: `Revoke Premium for ${selectedUser?.email || currentEntitlement.userId}? Access stops immediately.`,
      confirmText: 'Revoke',
      variant: 'danger',
      onConfirm: async () => submitRevokePremium(key),
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    loadUsers();
  };

  const toggleRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setConfirmAction({
      title: newRole === 'admin' ? 'Promote User' : 'Demote User',
      message: `Are you sure you want to ${newRole === 'admin' ? 'promote' : 'demote'} this user?`,
      confirmText: newRole === 'admin' ? 'Promote' : 'Demote',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
          });

          if (res.ok) {
            setUsers(users.map(u =>
              u.id === userId ? { ...u, role: newRole } : u
            ));
          }
        } catch (error) {
          console.error('Failed to update user:', error);
        }
        setMenuOpenId(null);
      },
    });
  };

  const suspendUser = (userId: string, email: string | null) => {
    setConfirmAction({
      title: 'Suspend user',
      message: `${email || 'This user'} won't be able to log in (credentials or OAuth) until you lift the suspension. Existing sessions remain valid until they expire (max 24h).`,
      confirmText: 'Suspend',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          if (res.ok) {
            const { user } = await res.json();
            setUsers(users.map(u => u.id === userId ? { ...u, suspendedAt: user.suspendedAt, suspendedReason: user.suspendedReason } : u));
          }
        } catch (error) {
          console.error('Failed to suspend user:', error);
        }
        setMenuOpenId(null);
      },
    });
  };

  const unsuspendUser = (userId: string) => {
    setConfirmAction({
      title: 'Lift suspension',
      message: `Restore login access for this user.`,
      confirmText: 'Unsuspend',
      variant: 'default',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/suspend`, {
            method: 'DELETE',
          });
          if (res.ok) {
            setUsers(users.map(u => u.id === userId ? { ...u, suspendedAt: null, suspendedReason: null } : u));
          }
        } catch (error) {
          console.error('Failed to unsuspend user:', error);
        }
        setMenuOpenId(null);
      },
    });
  };

  const deleteUser = (userId: string, email: string | null) => {
    const typeTarget = email || 'DELETE';
    setConfirmAction({
      title: 'Delete user',
      message: `This will permanently delete ${email || 'this user'} and every workspace, form, and submission they own. There is no undo.`,
      confirmText: 'Delete user',
      variant: 'danger',
      requireTypedConfirmation: typeTarget,
      typedConfirmationLabel: email
        ? `Type the user's email to confirm: ${email}`
        : `Type "DELETE" to confirm`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            setUsers(users.filter(u => u.id !== userId));
          }
        } catch (error) {
          console.error('Failed to delete user:', error);
        }
        setMenuOpenId(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Users</h1>
        <p className="text-gray-500 text-sm">Manage all platform users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, name, or user ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-with-icon w-full"
            />
          </div>
        </form>
        <div className="w-full sm:w-44">
          <Select
            value={roleFilter}
            onChange={(v) => {
              setRoleFilter(v);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            options={[
              { value: '', label: 'All roles' },
              { value: 'user', label: 'Users only' },
              { value: 'admin', label: 'Admins only' },
            ]}
            aria-label="Filter by role"
          />
        </div>
      </div>

      {/* Users Table - Desktop */}
      <div className="card overflow-hidden hidden sm:block">
        {loadError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Plan / Premium</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Workspaces</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Joined</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Spinner size={24} className="animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-900">{user.name || 'Unnamed'}</div>
                        {user.suspendedAt && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-amber-100 text-amber-800"
                            title={user.suspendedReason || `Suspended ${new Date(user.suspendedAt).toLocaleDateString()}`}
                          >
                            Suspended
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                      <div className="text-[11px] text-gray-400 font-mono truncate">{user.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                        user.role === 'admin'
                          ? 'bg-safety-orange/10 text-safety-orange'
                          : 'bg-gray-100 text-gray-600'
                      )}>
                        {user.role === 'admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {user.subscription ? (
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded text-xs font-medium capitalize',
                            user.subscription.plan === 'pro' ? 'bg-emerald-100 text-emerald-700' :
                            user.subscription.plan === 'trial' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          )}>
                            {user.subscription.plan}
                            {user.subscription.plan === 'trial' && user.subscription.trialEndsAt && (
                              <span className="ml-1 opacity-70">
                                ({Math.max(0, Math.ceil((new Date(user.subscription.trialEndsAt).getTime() - Date.now()) / 86400000))}d left)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Free</span>
                        )}
                        {user.premium?.active && (
                          <span className="flex w-fit items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-safety-orange/10 text-safety-orange">
                            <Crown size={12} weight="fill" />
                            Premium
                            {user.premium.expiresAt && (
                              <span className="opacity-70">({formatRemaining(user.premium.expiresAt)})</span>
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.workspaceCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.id === currentUserId ? (
                        <span className="text-xs text-gray-400">(You)</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPremiumPanel(user)}
                            className="btn btn-ghost text-xs"
                          >
                            <Crown size={14} />
                            Premium
                          </button>
                          <button
                            onClick={() => toggleRole(user.id, user.role)}
                            className="btn btn-ghost text-xs"
                          >
                            {user.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>
                          {user.suspendedAt ? (
                            <button
                              onClick={() => unsuspendUser(user.id)}
                              className="btn btn-ghost text-xs text-amber-700"
                            >
                              Unsuspend
                            </button>
                          ) : (
                            <button
                              onClick={() => suspendUser(user.id, user.email)}
                              className="btn btn-ghost text-xs text-amber-700"
                            >
                              Suspend
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(user.id, user.email)}
                            className="btn btn-ghost text-red-500 text-xs"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Desktop */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            />
          </div>
        )}
      </div>

      {/* Users Cards - Mobile */}
      <div className="sm:hidden space-y-3">
        {loadError && (
          <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loadError}
          </div>
        )}
        {loading ? (
          <div className="card p-8 text-center">
            <Spinner size={24} className="animate-spin text-gray-400 mx-auto" />
          </div>
        ) : users.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">No users found</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">
                      {user.name || 'Unnamed'}
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
                      user.role === 'admin'
                        ? 'bg-safety-orange/10 text-safety-orange'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      {user.role === 'admin' ? <Shield size={10} /> : <UserIcon size={10} />}
                      {user.role}
                    </span>
                    {user.premium?.active && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 bg-safety-orange/10 text-safety-orange">
                        <Crown size={10} weight="fill" />
                        Premium
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 truncate mt-0.5">{user.email}</div>
                  <div className="text-[11px] text-gray-400 font-mono truncate mt-0.5">{user.id}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{user.workspaceCount} workspace{user.workspaceCount !== 1 ? 's' : ''}</span>
                    <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {user.id === currentUserId ? (
                  <span className="text-xs text-gray-400 flex-shrink-0">(You)</span>
                ) : (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === user.id ? null : user.id)}
                      className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                    >
                      <DotsThreeVertical size={20} />
                    </button>
                    <AnimatePresence>
                      {menuOpenId === user.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setMenuOpenId(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1"
                          >
                            <button
                              onClick={() => {
                                setMenuOpenId(null);
                                openPremiumPanel(user);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Manage Premium
                            </button>
                            <button
                              onClick={() => toggleRole(user.id, user.role)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            </button>
                            {user.suspendedAt ? (
                              <button
                                onClick={() => unsuspendUser(user.id)}
                                className="w-full px-4 py-2 text-left text-sm text-amber-700 hover:bg-amber-50"
                              >
                                Lift suspension
                              </button>
                            ) : (
                              <button
                                onClick={() => suspendUser(user.id, user.email)}
                                className="w-full px-4 py-2 text-left text-sm text-amber-700 hover:bg-amber-50"
                              >
                                Suspend user
                              </button>
                            )}
                            <button
                              onClick={() => deleteUser(user.id, user.email)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              Delete User
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Pagination - Mobile */}
        {pagination.totalPages > 1 && (
          <div className="pt-2">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/40"
              onClick={closePremiumPanel}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 right-0 z-[80] w-full max-w-3xl bg-white shadow-2xl border-l border-gray-200 overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Crown size={20} weight="fill" className="text-safety-orange" />
                    <h2 className="text-lg font-semibold text-gray-900">Premium entitlement</h2>
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    {selectedUser.email || selectedUser.name || selectedUser.id}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400">{selectedUser.id}</p>
                </div>
                <button
                  type="button"
                  onClick={closePremiumPanel}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Close Premium entitlement panel"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                {actionError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {actionError}
                  </div>
                )}

                {detailsLoading ? (
                  <div className="flex h-40 items-center justify-center">
                    <Spinner size={24} className="animate-spin text-safety-orange" />
                  </div>
                ) : entitlementDetails ? (
                  <>
                    <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-mono text-[11px] uppercase tracking-[-0.015rem] text-gray-500">
                            Current Premium status
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={cn(
                              'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium capitalize',
                              statusBadgeClass(entitlementDetails.premium.status)
                            )}>
                              <Crown size={12} weight={entitlementDetails.premium.active ? 'fill' : 'regular'} />
                              {entitlementDetails.premium.active ? 'active' : entitlementDetails.premium.status}
                            </span>
                            <span className="text-sm text-gray-600">
                              {formatRemaining(entitlementDetails.premium.expiresAt)}
                            </span>
                          </div>
                        </div>
                        <div className="text-left text-sm text-gray-600 sm:text-right">
                          <div>Starts {formatDateTime(entitlementDetails.premium.startsAt)}</div>
                          <div>Expires {formatDateTime(entitlementDetails.premium.expiresAt)}</div>
                        </div>
                      </div>
                      {currentEntitlement && (
                        <div className="mt-4 grid gap-3 border-t border-gray-200 pt-4 text-sm sm:grid-cols-2">
                          <div>
                            <span className="text-gray-500">Reason</span>
                            <p className="mt-1 text-gray-900">{currentEntitlement.grantReason}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Source</span>
                            <p className="mt-1 capitalize text-gray-900">{currentEntitlement.source.replaceAll('_', ' ')}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Granted by</span>
                            <p className="mt-1 text-gray-900">{actorLabel(currentEntitlement.grantedByUser, currentEntitlement.grantedBy)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Granted at</span>
                            <p className="mt-1 text-gray-900">{formatDateTime(currentEntitlement.grantedAt)}</p>
                          </div>
                        </div>
                      )}
                    </section>

                    <section className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <Crown size={18} className="text-safety-orange" />
                        <h3 className="font-semibold text-gray-900">Grant Premium</h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-gray-600">Duration</label>
                          <Select
                            value={grantPreset}
                            onChange={setGrantPreset}
                            options={GRANT_OPTIONS}
                            aria-label="Premium grant duration"
                          />
                        </div>
                        {grantPreset === 'custom' && (
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-600">Expiration date</label>
                            <input
                              type="date"
                              value={grantCustomDate}
                              onChange={(e) => setGrantCustomDate(e.target.value)}
                              className="input"
                            />
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <label className="mb-1.5 block text-xs font-medium text-gray-600">Reason</label>
                        <textarea
                          value={grantReason}
                          onChange={(e) => setGrantReason(e.target.value)}
                          className="input min-h-20 resize-y"
                          maxLength={500}
                          placeholder="30-day promotional premium"
                        />
                      </div>
                      <div className="mt-3">
                        <label className="mb-1.5 block text-xs font-medium text-gray-600">Internal note</label>
                        <textarea
                          value={grantInternalNote}
                          onChange={(e) => setGrantInternalNote(e.target.value)}
                          className="input min-h-16 resize-y"
                          maxLength={1000}
                          placeholder="Optional context for support or audit review"
                        />
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button type="button" onClick={queueGrantPremium} className="btn btn-primary">
                          <Crown size={16} weight="fill" />
                          Grant Premium
                        </button>
                      </div>
                    </section>

                    <section className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <ArrowClockwise size={18} className="text-gray-600" />
                        <h3 className="font-semibold text-gray-900">Manage Premium</h3>
                      </div>
                      {currentEntitlement && entitlementDetails.premium.active ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-lg bg-gray-50 p-3">
                            <div className="mb-3 flex items-center gap-2">
                              <Clock size={16} className="text-gray-500" />
                              <span className="text-sm font-medium text-gray-900">Extend</span>
                            </div>
                            <Select
                              value={extendPreset}
                              onChange={setExtendPreset}
                              options={EXTEND_OPTIONS}
                              aria-label="Premium extension duration"
                            />
                            {extendPreset === 'custom' && (
                              <input
                                type="date"
                                value={extendCustomDate}
                                onChange={(e) => setExtendCustomDate(e.target.value)}
                                className="input mt-3"
                              />
                            )}
                            <textarea
                              value={extendReason}
                              onChange={(e) => setExtendReason(e.target.value)}
                              className="input mt-3 min-h-16 resize-y"
                              maxLength={500}
                              placeholder="Reason for extension"
                            />
                            <button type="button" onClick={queueExtendPremium} className="btn btn-secondary mt-3 w-full">
                              Extend
                            </button>
                          </div>

                          <div className="rounded-lg bg-red-50 p-3">
                            <div className="mb-3 flex items-center gap-2">
                              <X size={16} className="text-red-600" />
                              <span className="text-sm font-medium text-red-900">Revoke</span>
                            </div>
                            <textarea
                              value={revokeReason}
                              onChange={(e) => setRevokeReason(e.target.value)}
                              className="input min-h-24 resize-y bg-white"
                              maxLength={500}
                              placeholder="Reason for revocation"
                            />
                            <button type="button" onClick={queueRevokePremium} className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">
                              Revoke Premium
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No active Premium entitlement to extend or revoke.</p>
                      )}
                    </section>

                    <section className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-gray-900">Entitlement history</h3>
                        <span className="text-xs text-gray-500">{entitlementDetails.history.length} events</span>
                      </div>
                      {entitlementDetails.history.length === 0 ? (
                        <p className="text-sm text-gray-500">No entitlement history yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {entitlementDetails.history.map((item) => (
                            <div key={item.id} className="flex gap-3 rounded-lg bg-gray-50 p-3">
                              <div className="mt-1 h-2 w-2 rounded-full bg-safety-orange" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium capitalize text-gray-900">{item.action}</span>
                                  <span className="text-xs text-gray-500">{formatDateTime(item.createdAt)}</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                  {actorLabel(item.actor)} via {item.source.replaceAll('_', ' ')}
                                </p>
                                {item.reason && (
                                  <p className="mt-1 text-sm text-gray-700">{item.reason}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-gray-900">Grant records</h3>
                        <span className="text-xs text-gray-500">{entitlementDetails.entitlements.length} total</span>
                      </div>
                      {entitlementDetails.entitlements.length === 0 ? (
                        <p className="text-sm text-gray-500">No Premium grants recorded.</p>
                      ) : (
                        <div className="space-y-3">
                          {entitlementDetails.entitlements.map((item) => (
                            <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className={cn(
                                  'inline-flex items-center rounded px-2 py-1 text-xs font-medium capitalize',
                                  statusBadgeClass(item.status)
                                )}>
                                  {item.status}
                                </span>
                                <span className="font-mono text-[11px] text-gray-400">{item.id}</span>
                              </div>
                              <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                                <div>Starts {formatDateTime(item.startsAt)}</div>
                                <div>Expires {formatDateTime(item.expiresAt)}</div>
                                <div>Source {item.source.replaceAll('_', ' ')}</div>
                                <div>Granted by {actorLabel(item.grantedByUser, item.grantedBy)}</div>
                              </div>
                              <p className="mt-2 text-sm text-gray-900">{item.grantReason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-gray-900">Event delivery</h3>
                        <span className="text-xs text-gray-500">{entitlementDetails.events.length} recent</span>
                      </div>
                      {entitlementDetails.events.length === 0 ? (
                        <p className="text-sm text-gray-500">No entitlement events recorded.</p>
                      ) : (
                        <div className="space-y-2">
                          {entitlementDetails.events.slice(0, 8).map((event) => (
                            <div key={event.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium text-gray-900">{event.type}</span>
                                <span className={cn(
                                  'rounded px-2 py-0.5 text-xs font-medium capitalize',
                                  event.status === 'processed' ? 'bg-emerald-100 text-emerald-700' :
                                  event.status === 'failed' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                )}>
                                  {event.status}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">
                                Attempts {event.attempts} · {formatDateTime(event.createdAt)}
                              </p>
                              {event.lastError && (
                                <p className="mt-2 break-words text-xs text-red-700">{event.lastError}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Select a user to manage Premium.</p>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmText={confirmAction?.confirmText || 'Confirm'}
        variant={confirmAction?.variant || 'default'}
        requireTypedConfirmation={confirmAction?.requireTypedConfirmation}
        typedConfirmationLabel={confirmAction?.typedConfirmationLabel}
        onConfirm={async () => { await confirmAction?.onConfirm(); setConfirmAction(null); }}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
