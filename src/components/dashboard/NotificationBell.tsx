'use client';

import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { NotificationsListResponse } from '@/types/notifications';
import { useNotificationStream } from '@/hooks/useNotificationStream';

export interface NotificationBellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Close other header menus (e.g. user menu) before toggling */
  onRequestCloseOtherMenus?: () => void;
}

export const NotificationBell = forwardRef<HTMLDivElement, NotificationBellProps>(
  function NotificationBell({ open, onOpenChange, onRequestCloseOtherMenus }, ref) {
    const [items, setItems] = useState<NotificationsListResponse['notifications']>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [fetchErrorDetails, setFetchErrorDetails] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const load = useCallback(async (mode: 'list' | 'count' = 'list') => {
      setLoading(true);
      setFetchError(false);
      setFetchErrorDetails(null);
      try {
        const url = mode === 'count'
          ? '/api/notifications?limit=1'
          : '/api/notifications?limit=10';
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`(${res.status}) ${text || res.statusText}`);
        }
        const data = (await res.json()) as NotificationsListResponse;
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);

        if (mode === 'list') {
          const next = data.notifications ?? [];
          setItems(next);

          const unreadIds = next.filter((n) => !n.read).map((n) => n.id);
          if (unreadIds.length > 0) {
            // Fire-and-forget: mark what we just displayed as read
            fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: unreadIds }),
            }).catch(() => {});
            setUnreadCount((c) => Math.max(0, c - unreadIds.length));
          }
        }
      } catch (e) {
        setFetchError(true);
        setFetchErrorDetails(e instanceof Error ? e.message : 'Failed');
        if (mode === 'list') setItems([]);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      if (open) load('list');
    }, [open, load]);

    useNotificationStream(() => {
      if (open) {
        load('list');
      } else {
        load('count');
      }
    });

    useEffect(() => {
      // keep the badge fresh even if dropdown isn't opened
      const t = window.setInterval(() => {
        if (!open) load('count');
      }, 30000);
      return () => window.clearInterval(t);
    }, [open, load]);

    const displayBadge = unreadCount > 0;
    const badgeText = useMemo(() => {
      if (unreadCount <= 0) return '';
      if (unreadCount > 9) return '9+';
      return String(unreadCount);
    }, [unreadCount]);

    const markAllRead = async () => {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => {});
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const deleteNotification = async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
      setItems((prev) => prev.filter((n) => n.id !== id));
    };

    const toggle = () => {
      onRequestCloseOtherMenus?.();
      onOpenChange(!open);
    };

    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Notifications"
          className={cn(
            'relative p-2 rounded-lg hover:bg-gray-100 transition-colors',
            open ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
          )}
        >
          <Bell size={20} />
          {displayBadge && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-safety-orange text-[10px] font-bold text-dark-base-secondary flex items-center justify-center shadow-[0_0_6px_rgba(255,77,0,0.7)]">
              {badgeText}
            </span>
          )}
        </button>

        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop for outside click */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => onOpenChange(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] max-h-[min(70vh,24rem)] flex flex-col rounded-lg border border-gray-200 bg-white shadow-xl z-50 overflow-hidden"
                role="dialog"
                aria-label="Notification center"
              >
              <div className="px-4 py-3 border-b border-gray-200 shrink-0 flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500">
                    Notifications
                  </p>
                  <p className="text-sm text-gray-900 mt-1">
                    {loading
                      ? 'Loading…'
                      : fetchError
                      ? `Could not load alerts${fetchErrorDetails ? ` ${fetchErrorDetails}` : ''}`
                      : unreadCount > 0
                      ? `${unreadCount} unread`
                      : items.length === 0
                      ? 'No new alerts'
                      : 'All caught up'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  className="text-xs font-mono uppercase tracking-[-0.015rem] text-gray-500 hover:text-gray-900 disabled:opacity-50"
                >
                  Mark all read
                </button>
              </div>

              {!loading && !fetchError && items.length > 0 && (
                <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
                  {items.map((n) => {
                    const content = (
                      <span
                        className={cn(
                          'block text-sm',
                          n.read ? 'text-gray-500' : 'text-gray-900 font-medium'
                        )}
                      >
                        {n.title}
                        {n.body && (
                          <span className="block text-xs font-normal text-gray-500 mt-0.5">{n.body}</span>
                        )}
                      </span>
                    );
                    return (
                      <li key={n.id}>
                        <div className="flex items-stretch">
                          {n.href ? (
                            <Link
                              href={n.href}
                              onClick={() => onOpenChange(false)}
                              className="flex-1 block px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              {content}
                            </Link>
                          ) : (
                            <div className="flex-1 px-4 py-3">{content}</div>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteNotification(n.id)}
                            className="px-3 text-gray-500 hover:text-red-500 hover:bg-gray-50 transition-colors"
                            aria-label="Delete notification"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="p-4 space-y-3 border-t border-gray-200 shrink-0">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => onOpenChange(false)}
                  className="block w-full text-center py-2.5 rounded-sm font-mono text-[12px] uppercase tracking-[-0.015rem] bg-safety-orange text-white hover:bg-accent-200 transition-colors"
                >
                  View all notifications
                </Link>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Submission alerts and digests are also sent by email. Manage delivery under notification
                  settings.
                </p>
                <Link
                  href="/dashboard/settings?tab=notifications"
                  onClick={() => onOpenChange(false)}
                  className="block w-full text-center py-2.5 rounded-sm font-mono text-[12px] uppercase tracking-[-0.015rem] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Notification settings
                </Link>
              </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
