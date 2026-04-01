'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Sparkle, ArrowRight } from '@phosphor-icons/react';
import { useWorkspace } from '@/contexts/workspace-context';

const DISMISS_KEY = 'forma_upgrade_banner_dismissed';

export function UpgradeBanner() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [plan, setPlan] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true); // Start hidden to prevent flash
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for dismissal (with expiry - show again after 7 days)
    const dismissedData = localStorage.getItem(DISMISS_KEY);
    if (dismissedData) {
      const { timestamp, workspaceId } = JSON.parse(dismissedData);
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (timestamp > sevenDaysAgo && workspaceId === currentWorkspace?.id) {
        setDismissed(true);
        setLoading(false);
        return;
      }
    }
    setDismissed(false);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (workspaceLoading || !currentWorkspace) return;

    const fetchSubscription = async () => {
      try {
        const res = await fetch(`/api/workspaces/${currentWorkspace.id}/subscription`);
        if (res.ok) {
          const data = await res.json();
          setPlan(data.subscription?.plan || 'free');
        }
      } catch {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [currentWorkspace, workspaceLoading]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(
      DISMISS_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        workspaceId: currentWorkspace?.id,
      })
    );
  };

  // Don't show if loading, dismissed, or not on free plan
  if (loading || dismissed || !plan || plan !== 'free') {
    return null;
  }

  return (
    <div className="mb-4 bg-gradient-to-r from-safety-orange/10 to-amber-500/10 border border-safety-orange/20 rounded-xl p-4 flex items-center gap-4">
      <div className="hidden sm:flex p-2.5 rounded-lg bg-safety-orange/20">
        <Sparkle size={20} className="text-safety-orange" weight="fill" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">You're on the Free plan</div>
        <p className="text-sm text-gray-600 mt-0.5">
          Upgrade to Pro for unlimited forms, advanced analytics, team collaboration, and more.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/dashboard/settings?tab=billing"
          className="btn btn-primary text-sm py-2 px-4 whitespace-nowrap"
        >
          <span className="hidden sm:inline">Upgrade to Pro</span>
          <span className="sm:hidden">Upgrade</span>
          <ArrowRight size={16} className="hidden sm:inline" />
        </Link>
        <button
          onClick={handleDismiss}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
