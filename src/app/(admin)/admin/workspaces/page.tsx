'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MagnifyingGlass,
  Spinner,
  CaretLeft,
  CaretRight,
  Buildings,
  Users,
  Files,
  Crown,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface Workspace {
  id: string;
  name: string;
  isPersonal: boolean;
  createdAt: string;
  logoUrl: string | null;
  owner: { id: string; name: string | null; email: string | null } | null;
  formCount: number;
  memberCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminWorkspacesPage() {
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [search, setSearch] = useState('');

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/workspaces?${params}`);
      const data = await res.json();
      setWorkspaces(data.workspaces || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Workspaces</h1>
        <p className="text-gray-500 mt-1">
          {pagination.total} workspace{pagination.total !== 1 ? 's' : ''} across the platform
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative max-w-md">
        <MagnifyingGlass
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or owner email..."
          className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-safety-orange focus:ring-1 focus:ring-safety-orange"
        />
      </form>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Workspace</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Members</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Forms</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workspaces.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No workspaces found
                    </td>
                  </tr>
                ) : (
                  workspaces.map((ws) => (
                    <tr key={ws.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-safety-orange/10 flex items-center justify-center flex-shrink-0">
                            <Buildings size={16} className="text-safety-orange" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{ws.name}</div>
                            {ws.isPersonal && (
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Personal</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {ws.owner ? (
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-gray-900">
                              <Crown size={12} className="text-amber-500 flex-shrink-0" />
                              <span className="truncate">{ws.owner.name || ws.owner.email}</span>
                            </div>
                            {ws.owner.name && (
                              <div className="text-xs text-gray-500 truncate">{ws.owner.email}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No owner</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5 text-gray-700">
                          <Users size={14} className="text-gray-400" />
                          {ws.memberCount}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5 text-gray-700">
                          <Files size={14} className="text-gray-400" />
                          {ws.formCount}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(ws.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CaretLeft size={16} />
                </button>
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CaretRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
