'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MagnifyingGlass,
  Spinner,
  ShieldCheck,
  Warning,
  SignIn,
  Trash,
  UserPlus,
  Key,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import Pagination from '@/components/ui/Pagination';
import { cn } from '@/lib/utils';

interface AuditEntry {
  id: string;
  action: string;
  userId: string | null;
  ip: string | null;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const actionCategories = [
  { value: '', label: 'All Events' },
  { value: 'auth', label: 'Authentication' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'form', label: 'Forms' },
  { value: 'admin', label: 'Admin' },
  { value: 'subscription', label: 'Billing' },
  { value: 'security', label: 'Security' },
  { value: 'api_key', label: 'API Keys' },
];

function getActionIcon(action: string) {
  if (action.startsWith('auth.login')) return SignIn;
  if (action.startsWith('auth.')) return Key;
  if (action.startsWith('security.')) return Warning;
  if (action.startsWith('admin.delete')) return Trash;
  if (action.startsWith('admin.')) return ShieldCheck;
  if (action.includes('invite') || action.includes('register')) return UserPlus;
  if (action.includes('transfer') || action.includes('role_change')) return ArrowsClockwise;
  if (action.includes('delete')) return Trash;
  return ShieldCheck;
}

function getActionColor(action: string) {
  if (action.includes('failed') || action.startsWith('security.')) return 'text-red-600 bg-red-50';
  if (action.includes('delete') || action.includes('remove')) return 'text-red-600 bg-red-50';
  if (action.includes('login_success')) return 'text-emerald-600 bg-emerald-50';
  if (action.startsWith('admin.')) return 'text-amber-600 bg-amber-50';
  return 'text-blue-600 bg-blue-50';
}

function formatAction(action: string) {
  return action
    .replace(/\./g, ' \u203A ')
    .replace(/_/g, ' ');
}

function formatTimeAgo(date: string) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminAuditLogPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 50, total: 0, totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);

      const res = await fetch(`/api/admin/audit-log?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 mt-1">
          Security events and sensitive operations ({pagination.total} total)
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
            placeholder="Search actions, user IDs, details..."
            className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-safety-orange focus:ring-1 focus:ring-safety-orange"
          />
        </form>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-safety-orange min-w-[150px]"
        >
          {actionCategories.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Log entries */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} className="animate-spin text-gray-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          No audit log entries found
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const Icon = getActionIcon(log.action);
              const colorClass = getActionColor(log.action);

              return (
                <div key={log.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', colorClass)}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {formatAction(log.action)}
                      </span>
                      {log.ip && (
                        <span className="text-[10px] text-gray-400 font-mono">{log.ip}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      {log.details?.email ? (
                        <span className="truncate max-w-[200px]" title={log.userId || ''}>
                          {log.details.name ? `${String(log.details.name)} · ` : ''}{String(log.details.email)}
                        </span>
                      ) : log.userId ? (
                        <span className="font-mono truncate max-w-[200px]" title={log.userId}>
                          user: {log.userId.slice(0, 12)}...
                        </span>
                      ) : null}
                      {log.details?.provider && (
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] uppercase tracking-wider">
                          {String(log.details.provider)}
                        </span>
                      )}
                      {log.resourceType && (
                        <span>
                          {log.resourceType}: {log.resourceId?.slice(0, 12)}...
                        </span>
                      )}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-1 text-xs text-gray-400 font-mono truncate max-w-[500px]">
                        {Object.entries(log.details)
                          .filter(([, v]) => v !== null && v !== undefined)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0" title={new Date(log.createdAt).toLocaleString()}>
                    {formatTimeAgo(log.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
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
