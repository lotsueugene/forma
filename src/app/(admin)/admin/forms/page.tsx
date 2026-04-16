'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MagnifyingGlass,
  Spinner,
  Files,
  Lightning,
  EnvelopeSimple,
  Buildings,
} from '@phosphor-icons/react';
import Pagination from '@/components/ui/Pagination';
import { cn } from '@/lib/utils';

interface AdminForm {
  id: string;
  name: string;
  status: string;
  formType: string;
  createdAt: string;
  updatedAt: string;
  workspace: { id: string; name: string };
  submissionCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminFormsPage() {
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<AdminForm[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/forms?${params}`);
      const data = await res.json();
      setForms(data.forms || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      draft: 'bg-gray-100 text-gray-600',
      paused: 'bg-amber-100 text-amber-700',
      archived: 'bg-gray-100 text-gray-500',
    };
    return styles[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Forms</h1>
        <p className="text-gray-500 mt-1">
          {pagination.total} form{pagination.total !== 1 ? 's' : ''} across all workspaces
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by form or workspace name..."
            className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-safety-orange focus:ring-1 focus:ring-safety-orange"
          />
        </form>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-safety-orange min-w-[130px]"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </div>

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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Form</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Workspace</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Submissions</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No forms found
                    </td>
                  </tr>
                ) : (
                  forms.map((form) => (
                    <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {form.formType === 'endpoint' ? (
                              <Lightning size={16} className="text-gray-600" />
                            ) : (
                              <Files size={16} className="text-gray-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{form.name}</div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                              {form.formType === 'endpoint' ? 'API' : 'Builder'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-700 min-w-0">
                          <Buildings size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">{form.workspace.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                          statusBadge(form.status)
                        )}>
                          {form.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5 text-gray-700">
                          <EnvelopeSimple size={14} className="text-gray-400" />
                          {form.submissionCount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(form.createdAt)}
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
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
