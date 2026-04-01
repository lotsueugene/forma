'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bell, Check, Trash, Spinner, FunnelSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/workspace-context';
import type { DashboardNotification, NotificationsListResponse } from '@/types/notifications';
import { useNotificationStream } from '@/hooks/useNotificationStream';

type Filter = 'all' | 'unread';

export default function NotificationsPage() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [items, setItems] = useState<DashboardNotification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [workspaceScope, setWorkspaceScope] = useState<string>('current');

  const effectiveWorkspaceId = useMemo(() => {
    if (workspaceScope === 'all') return null;
    return currentWorkspace?.id ?? null;
  }, [workspaceScope, currentWorkspace?.id]);

  const buildUrl = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set('limit', '30');
      if (cursor) params.set('cursor', cursor);
      if (filter === 'unread') params.set('unreadOnly', 'true');
      if (effectiveWorkspaceId) params.set('workspaceId', effectiveWorkspaceId);
      return `/api/notifications?${params.toString()}`;
    },
    [filter, effectiveWorkspaceId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl(null));
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Failed to load notifications (${res.status}): ${text || res.statusText}`);
      }
      const data = (await res.json()) as NotificationsListResponse;
      setItems(data.notifications ?? []);
      setNextCursor(data.nextCursor ?? null);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
      setItems([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    if (workspaceLoading) return;
    load();
  }, [workspaceLoading, load]);

  useNotificationStream(() => {
    // if something changed, refresh the first page (keeps unread count accurate)
    if (!workspaceLoading) load();
  });

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(nextCursor));
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Failed to load more (${res.status}): ${text || res.statusText}`);
      }
      const data = (await res.json()) as NotificationsListResponse;
      setItems((prev) => [...prev, ...(data.notifications ?? [])]);
      setNextCursor(data.nextCursor ?? null);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const markAllRead = async () => {
    const payload: { workspaceId?: string } = {};
    if (effectiveWorkspaceId) payload.workspaceId = effectiveWorkspaceId;
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const toggleRead = async (id: string, read: boolean) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read }),
    }).catch(() => {});
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read } : n)));
    setUnreadCount((c) => c + (read ? -1 : 1));
  };

  const remove = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const scopeLabel = workspaceScope === 'all'
    ? 'All workspaces'
    : currentWorkspace
    ? currentWorkspace.name
    : 'Current workspace';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Bell size={22} className="text-accent-200" />
            Notifications
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} · {scopeLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="btn btn-secondary disabled:opacity-50"
          >
            <Check size={18} />
            Mark all read
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <FunnelSimple size={16} />
          Filters
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'unread'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border',
                filter === k
                  ? 'border-accent-100 bg-accent-100/15 text-accent-300'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              )}
            >
              {k === 'all' ? 'All' : 'Unread'}
            </button>
          ))}
        </div>

        <div className="md:ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-600">Workspace</span>
          <select
            className="input h-9 py-0"
            value={workspaceScope}
            onChange={(e) => setWorkspaceScope(e.target.value)}
          >
            <option value="current">Current</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size={28} className="animate-spin text-accent-200" />
        </div>
      ) : error ? (
        <div className="card p-6 border border-red-500/20 bg-red-500/10 text-red-600">
          {error}
          <div className="mt-4">
            <button type="button" onClick={load} className="btn btn-secondary">
              Retry
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-900 font-medium">No notifications</p>
          <p className="text-gray-600 text-sm mt-2">
            Activity like new submissions, invites, and billing changes will appear here.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-200">
            {items.map((n, index) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(0.2, index * 0.01) }}
                className={cn(
                  'p-4 flex gap-4 items-start hover:bg-gray-50 transition-colors',
                  !n.read && 'bg-accent-100/8'
                )}
              >
                <div className="mt-1 w-2 h-2 rounded-full shrink-0">
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-safety-orange shadow-[0_0_6px_rgba(255,77,0,0.7)]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {n.href ? (
                        <Link href={n.href} className="text-gray-900 font-medium hover:underline">
                          {n.title}
                        </Link>
                      ) : (
                        <div className="text-gray-900 font-medium">{n.title}</div>
                      )}
                      {n.body && <div className="text-sm text-gray-600 mt-1 truncate">{n.body}</div>}
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(n.createdAt).toLocaleString()}
                        {n.type ? ` · ${n.type}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleRead(n.id, !n.read)}
                        className="btn btn-ghost text-sm"
                      >
                        {n.read ? 'Mark unread' : 'Mark read'}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(n.id)}
                        className="btn btn-ghost text-red-600 hover:text-red-600 text-sm"
                        aria-label="Delete notification"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {nextCursor && (
            <div className="p-4 border-t border-gray-200 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="btn btn-secondary"
              >
                {loadingMore ? (
                  <>
                    <Spinner size={16} className="animate-spin" />
                    Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

