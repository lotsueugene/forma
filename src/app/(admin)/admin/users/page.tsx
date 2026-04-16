'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  MagnifyingGlass,
  Spinner,
  CaretLeft,
  CaretRight,
  Shield,
  User as UserIcon,
  Trash,
  DotsThreeVertical,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  workspaceCount: number;
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

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [loading, setLoading] = useState(true);
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
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'default';
    onConfirm: () => Promise<void>;
  } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();

      setUsers(data.users || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

  const deleteUser = (userId: string, email: string | null) => {
    setConfirmAction({
      title: 'Delete User',
      message: `Are you sure you want to delete ${email || 'this user'}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
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
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-with-icon w-full"
            />
          </div>
        </form>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPagination(p => ({ ...p, page: 1 }));
          }}
          className="input w-full sm:w-auto"
        >
          <option value="">All roles</option>
          <option value="user">Users only</option>
          <option value="admin">Admins only</option>
        </select>
      </div>

      {/* Users Table - Desktop */}
      <div className="card overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Plan</th>
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
                      <div className="text-sm text-gray-900">{user.name || 'Unnamed'}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
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
                            onClick={() => toggleRole(user.id, user.role)}
                            className="btn btn-ghost text-xs"
                          >
                            {user.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagination(p => ({ ...p, page: 1 }))}
                disabled={pagination.page === 1}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pg: number;
                if (pagination.totalPages <= 5) pg = i + 1;
                else if (pagination.page <= 3) pg = i + 1;
                else if (pagination.page >= pagination.totalPages - 2) pg = pagination.totalPages - 4 + i;
                else pg = pagination.page - 2 + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPagination(p => ({ ...p, page: pg }))}
                    className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${
                      pg === pagination.page ? 'bg-safety-orange text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: pagination.totalPages }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users Cards - Mobile */}
      <div className="sm:hidden space-y-3">
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
                  </div>
                  <div className="text-sm text-gray-500 truncate mt-0.5">{user.email}</div>
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
                              onClick={() => toggleRole(user.id, user.role)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            </button>
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
          <div className="flex items-center justify-center gap-1 pt-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500 px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmText={confirmAction?.confirmText || 'Confirm'}
        variant={confirmAction?.variant || 'default'}
        onConfirm={async () => { await confirmAction?.onConfirm(); setConfirmAction(null); }}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
