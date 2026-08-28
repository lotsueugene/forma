'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle,
  Clock,
  Lightning,
  MagnifyingGlass,
  Spinner,
  Warning,
  XCircle,
} from '@phosphor-icons/react';
import Pagination from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

interface AiUsageLog {
  id: string;
  action: string;
  provider: string;
  modelId: string;
  status: string;
  promptHash: string | null;
  promptChars: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  generatedFieldCount: number | null;
  latencyMs: number | null;
  ip: string | null;
  userAgent: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; role: string; createdAt: string } | null;
  workspace: { id: string; name: string; slug: string } | null;
}

interface AiUsageSummary {
  total: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  generatedFieldCount: number;
  averageLatencyMs: number;
  byStatus: Record<string, number>;
  topUsers: Array<{
    userId: string;
    user: { id: string; name: string | null; email: string | null; role: string } | null;
    requests: number;
    totalTokens: number;
  }>;
  topIps: Array<{
    ip: string | null;
    requests: number;
    totalTokens: number;
  }>;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'rate_limited', label: 'Rate limited' },
];

const WINDOW_OPTIONS = [
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

function formatNumber(value: number | null | undefined) {
  return (value || 0).toLocaleString();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusStyle(status: string) {
  if (status === 'success') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  if (status === 'blocked') return 'bg-amber-100 text-amber-700';
  if (status === 'rate_limited') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-600';
}

function statusIcon(status: string) {
  if (status === 'success') return CheckCircle;
  if (status === 'failed') return XCircle;
  if (status === 'blocked' || status === 'rate_limited') return Warning;
  return Clock;
}

function userLabel(log: AiUsageLog) {
  return log.user?.email || log.user?.name || log.user?.id || log.id;
}

export default function AdminAiUsagePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<AiUsageLog[]>([]);
  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState('7');

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        days: daysFilter,
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/ai-usage?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load AI usage');

      setLogs(data.logs || []);
      setSummary(data.summary || null);
      setPagination((current) => data.pagination || current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI usage');
      setLogs([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, daysFilter]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const statCards = [
    { label: 'Requests', value: formatNumber(summary?.total), icon: Lightning },
    { label: 'Tokens', value: formatNumber(summary?.totalTokens), icon: Lightning },
    { label: 'Input', value: formatNumber(summary?.inputTokens), icon: Lightning },
    { label: 'Output', value: formatNumber(summary?.outputTokens), icon: Lightning },
    { label: 'Fields', value: formatNumber(summary?.generatedFieldCount), icon: CheckCircle },
    { label: 'Avg latency', value: `${formatNumber(summary?.averageLatencyMs)}ms`, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">AI Usage</h1>
        <p className="text-gray-500 mt-1">
          {pagination.total.toLocaleString()} AI event{pagination.total === 1 ? '' : 's'} in this window
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <stat.icon size={18} />
            </div>
            <div className="text-xl font-semibold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <form onSubmit={submitSearch} className="relative flex-1">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search user, email, IP, model, error..."
            className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-safety-orange focus:ring-1 focus:ring-safety-orange"
          />
        </form>
        <div className="grid grid-cols-2 gap-3 lg:w-[380px]">
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPagination((current) => ({ ...current, page: 1 }));
            }}
            options={STATUS_OPTIONS}
            aria-label="Filter by status"
          />
          <Select
            value={daysFilter}
            onChange={(value) => {
              setDaysFilter(value);
              setPagination((current) => ({ ...current, page: 1 }));
            }}
            options={WINDOW_OPTIONS}
            aria-label="Filter by time window"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900">Top users</h2>
          <div className="space-y-3">
            {(summary?.topUsers || []).length === 0 ? (
              <p className="text-sm text-gray-500">No usage in this window</p>
            ) : (
              summary?.topUsers.map((item) => (
                <div key={item.userId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate text-gray-900">
                      {item.user?.email || item.user?.name || item.userId}
                    </div>
                    <div className="truncate font-mono text-[11px] text-gray-400">{item.userId}</div>
                  </div>
                  <div className="shrink-0 text-right text-gray-500">
                    <div>{item.requests.toLocaleString()} req</div>
                    <div className="text-xs">{item.totalTokens.toLocaleString()} tokens</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900">Top IPs</h2>
          <div className="space-y-3">
            {(summary?.topIps || []).length === 0 ? (
              <p className="text-sm text-gray-500">No usage in this window</p>
            ) : (
              summary?.topIps.map((item) => (
                <button
                  key={item.ip || 'unknown'}
                  type="button"
                  onClick={() => {
                    setSearch(item.ip || '');
                    setPagination((current) => ({ ...current, page: 1 }));
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-mono text-gray-900">{item.ip || 'unknown'}</span>
                  <span className="shrink-0 text-right text-gray-500">
                    <span>{item.requests.toLocaleString()} req</span>
                    <span className="ml-2 text-xs">{item.totalTokens.toLocaleString()} tokens</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold text-gray-900">Recent AI events</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size={28} className="animate-spin text-gray-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">No AI usage found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">IP / Agent</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3 text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const Icon = statusIcon(log.status);
                  return (
                    <tr key={log.id} className="align-top hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="max-w-[260px] truncate text-sm text-gray-900">
                          {userLabel(log)}
                        </div>
                        <div className="max-w-[260px] truncate font-mono text-[11px] text-gray-400">
                          {log.user?.id || log.id}
                        </div>
                        {log.workspace && (
                          <div className="max-w-[260px] truncate text-xs text-gray-500">
                            {log.workspace.name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium capitalize',
                          statusStyle(log.status)
                        )}>
                          <Icon size={12} />
                          {log.status.replaceAll('_', ' ')}
                        </span>
                        {log.errorCode && (
                          <div className="mt-1 max-w-[180px] truncate text-xs text-red-600">
                            {log.errorCode}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>{formatNumber(log.totalTokens)} tokens</div>
                        <div className="text-xs text-gray-400">
                          {formatNumber(log.inputTokens)} in · {formatNumber(log.outputTokens)} out
                        </div>
                        <div className="text-xs text-gray-400">
                          {log.promptChars.toLocaleString()} chars · {formatNumber(log.generatedFieldCount)} fields
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSearch(log.ip || '');
                            setPagination((current) => ({ ...current, page: 1 }));
                          }}
                          className="font-mono text-xs text-gray-700 hover:text-safety-orange"
                        >
                          {log.ip || 'unknown'}
                        </button>
                        {log.userAgent && (
                          <div className="mt-1 max-w-[240px] truncate text-xs text-gray-400" title={log.userAgent}>
                            {log.userAgent}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">{log.provider}</div>
                        <div className="max-w-[220px] truncate font-mono text-[11px] text-gray-400" title={log.modelId}>
                          {log.modelId}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {formatDate(log.createdAt)}
                        {log.latencyMs !== null && (
                          <div className="text-xs text-gray-400">{log.latencyMs}ms</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
            />
          </div>
        )}
      </section>
    </div>
  );
}
