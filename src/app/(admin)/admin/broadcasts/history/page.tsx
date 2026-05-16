'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Spinner,
  EnvelopeSimple,
  PaperPlaneTilt,
  CheckCircle,
  XCircle,
  Clock,
  Trash,
  CaretLeft,
  Users,
  UserCircle,
  Tag,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Broadcast {
  id: string;
  subject: string;
  content: string;
  targetAll: boolean;
  targetPlans: string | null;
  targetUserIds: string | null;
  sentCount: number;
  failedCount: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

const statusConfig = {
  draft:   { icon: Clock, color: 'bg-gray-100 text-gray-600', label: 'Draft' },
  sending: { icon: Spinner, color: 'bg-blue-100 text-blue-600', label: 'Sending' },
  sent:    { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600', label: 'Sent' },
  failed:  { icon: XCircle, color: 'bg-red-100 text-red-600', label: 'Failed' },
};

function audienceSummary(b: Broadcast): { label: string; icon: typeof Users } {
  if (b.targetUserIds) {
    let count = 0;
    try { count = (JSON.parse(b.targetUserIds) as string[]).length; } catch {}
    return { label: `${count} specific user${count === 1 ? '' : 's'}`, icon: UserCircle };
  }
  if (b.targetAll) return { label: 'All users', icon: Users };
  if (b.targetPlans) return { label: `Plans: ${b.targetPlans}`, icon: Tag };
  return { label: 'No audience', icon: Users };
}

export default function BroadcastHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Broadcast | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/broadcasts')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setBroadcasts(data.broadcasts || []);
      })
      .catch((e) => console.error('Failed to load broadcasts:', e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/broadcasts/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setBroadcasts(broadcasts.filter((b) => b.id !== deleteTarget.id));
      }
    } catch (error) {
      console.error('Failed to delete broadcast:', error);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/broadcasts"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-1"
          >
            <CaretLeft size={14} />
            Back to broadcasts
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Broadcast History</h1>
          <p className="text-gray-600">Every email broadcast you&apos;ve sent or saved as draft</p>
        </div>
        <Link href="/admin/broadcasts" className="btn btn-primary">
          <PaperPlaneTilt size={16} />
          New Broadcast
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size={24} className="animate-spin text-gray-400" />
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <EnvelopeSimple size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No broadcasts yet</h3>
          <p className="text-gray-500 mb-4">Send your first email broadcast to reach your users.</p>
          <Link href="/admin/broadcasts" className="btn btn-primary inline-flex">
            Compose Broadcast
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((broadcast) => {
            const status = statusConfig[broadcast.status as keyof typeof statusConfig] || statusConfig.draft;
            const StatusIcon = status.icon;
            const audience = audienceSummary(broadcast);
            const AudienceIcon = audience.icon;

            return (
              <div key={broadcast.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-gray-100 flex-shrink-0">
                      <EnvelopeSimple size={18} className="text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate">{broadcast.subject}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {broadcast.content.replace(/<[^>]*>/g, '').slice(0, 140)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded', status.color)}>
                          <StatusIcon size={12} className={broadcast.status === 'sending' ? 'animate-spin' : ''} />
                          {status.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <AudienceIcon size={12} />
                          {audience.label}
                        </span>
                        {broadcast.status === 'sent' && (
                          <>
                            <span className="text-emerald-600">{broadcast.sentCount} sent</span>
                            {broadcast.failedCount > 0 && (
                              <span className="text-red-600">{broadcast.failedCount} failed</span>
                            )}
                          </>
                        )}
                        <span>
                          {broadcast.sentAt
                            ? `Sent ${new Date(broadcast.sentAt).toLocaleString()}`
                            : `Created ${new Date(broadcast.createdAt).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(broadcast)}
                    className="btn btn-ghost text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 p-2"
                    title="Delete broadcast"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete broadcast"
        message={`Permanently remove "${deleteTarget?.subject || ''}" and its reply history. This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        requireTypedConfirmation="DELETE"
        typedConfirmationLabel='Type "DELETE" to confirm'
      />
    </div>
  );
}
