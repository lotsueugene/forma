'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, X } from '@phosphor-icons/react';
import { useNotificationStream } from '@/hooks/useNotificationStream';

interface PendingPremiumNotification {
  id: string;
  title: string;
  message: string | null;
  entitlement: {
    startsAt: string;
    expiresAt: string | null;
  } | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function PremiumGrantModal() {
  const [queue, setQueue] = useState<PendingPremiumNotification[]>([]);
  const [active, setActive] = useState<PendingPremiumNotification | null>(null);
  const [nowMs, setNowMs] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/user/entitlements', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as {
        pendingPremiumNotifications?: PendingPremiumNotification[];
      };
      const pending = data.pendingPremiumNotifications ?? [];
      setNowMs(Date.now());
      setQueue(pending);
      setActive((current) => current ?? pending[0] ?? null);
    } catch {
      // The modal is celebratory, not critical UI. Leave the dashboard alone.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useNotificationStream(() => {
    load();
  });

  const entitlement = active?.entitlement ?? null;
  const isFuture = entitlement?.startsAt
    ? new Date(entitlement.startsAt).getTime() > nowMs
    : false;

  const dismiss = async () => {
    if (!active) return;
    const dismissed = active;
    const remaining = queue.filter((item) => item.id !== dismissed.id);
    setActive(remaining[0] ?? null);
    setQueue(remaining);

    await fetch(`/api/notifications/${dismissed.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayed: true, read: true }),
    }).catch(() => {});
  };

  return (
    <AnimatePresence>
      {active && entitlement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-grant-title"
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="p-7 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-safety-orange/10 text-safety-orange">
                <Crown size={30} weight="fill" />
              </div>
              <h2 id="premium-grant-title" className="text-2xl font-semibold text-gray-900">
                You&apos;ve received Premium!
              </h2>
              <p className="mt-3 text-sm text-gray-600">
                Premium has been added to your account.
              </p>

              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                {isFuture && (
                  <>
                    <p className="text-xs font-mono uppercase tracking-[-0.015rem] text-gray-500">
                      Premium access begins
                    </p>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {formatDate(entitlement.startsAt)}
                    </p>
                  </>
                )}
                <p className={isFuture ? 'mt-4 text-xs font-mono uppercase tracking-[-0.015rem] text-gray-500' : 'text-xs font-mono uppercase tracking-[-0.015rem] text-gray-500'}>
                  {entitlement.expiresAt ? 'Active until' : 'No expiration date'}
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {entitlement.expiresAt ? formatDate(entitlement.expiresAt) : 'Permanent access'}
                </p>
              </div>

              <p className="mt-5 text-sm text-gray-600">Enjoy your Premium features.</p>

              <button
                type="button"
                onClick={dismiss}
                className="btn btn-primary mt-6 w-full"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
