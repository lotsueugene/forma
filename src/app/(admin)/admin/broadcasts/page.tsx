'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Spinner,
  EnvelopeSimple,
  PaperPlaneTilt,
  CheckCircle,
  XCircle,
  Clock,
  Trash,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface Broadcast {
  id: string;
  subject: string;
  content: string;
  targetAll: boolean;
  targetPlans: string | null;
  sentCount: number;
  failedCount: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

const statusConfig = {
  draft: { icon: Clock, color: 'bg-gray-100 text-gray-600', label: 'Draft' },
  sending: { icon: Spinner, color: 'bg-blue-100 text-blue-600', label: 'Sending' },
  sent: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600', label: 'Sent' },
  failed: { icon: XCircle, color: 'bg-red-100 text-red-600', label: 'Failed' },
};

export default function AdminBroadcastsPage() {
  const [loading, setLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    targetAll: true,
    targetPlans: '',
    sendNow: false,
  });

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/broadcasts');
      const data = await res.json();
      setBroadcasts(data.broadcasts || []);
    } catch (error) {
      console.error('Failed to load broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.sendNow) {
      const confirmed = confirm(
        'Are you sure you want to send this email broadcast immediately? This cannot be undone.'
      );
      if (!confirmed) return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          targetPlans: formData.targetAll ? null : formData.targetPlans,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({
          subject: '',
          content: '',
          targetAll: true,
          targetPlans: '',
          sendNow: false,
        });
        loadBroadcasts();
      }
    } catch (error) {
      console.error('Failed to create broadcast:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteBroadcast = async (id: string, subject: string) => {
    const confirmation = prompt(
      `Are you sure you want to delete "${subject}"?\n\nType DELETE to confirm:`
    );

    if (confirmation !== 'DELETE') {
      if (confirmation !== null) {
        alert('Deletion cancelled. You must type DELETE to confirm.');
      }
      return;
    }

    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setBroadcasts(broadcasts.filter(b => b.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete broadcast:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Email Broadcasts</h1>
          <p className="text-gray-600">Send marketing emails to all users</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          New Broadcast
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={createBroadcast} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Create Email Broadcast</h2>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="input w-full"
              placeholder="Your email subject line"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Message (use {"{{name}}"} to personalize with user's name)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input w-full h-48"
              placeholder="Hi {{name}},

We're excited to share some updates with you!

Your message here...

Best,
The Forma Team"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Just type your message. It will be automatically styled with the Forma email template.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.targetAll}
                  onChange={(e) => setFormData({ ...formData, targetAll: e.target.checked })}
                />
                Send to all users
              </label>
            </div>
            {!formData.targetAll && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Target Plans</label>
                <input
                  type="text"
                  value={formData.targetPlans}
                  onChange={(e) => setFormData({ ...formData, targetPlans: e.target.value })}
                  className="input w-full"
                  placeholder="free,trial,pro"
                />
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <label className="flex items-center gap-2 text-sm text-amber-700">
              <input
                type="checkbox"
                checked={formData.sendNow}
                onChange={(e) => setFormData({ ...formData, sendNow: e.target.checked })}
              />
              Send immediately (cannot be undone)
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <Spinner size={16} className="animate-spin" />
              ) : formData.sendNow ? (
                <PaperPlaneTilt size={16} />
              ) : (
                <Plus size={16} />
              )}
              {formData.sendNow ? 'Send Now' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Broadcasts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size={24} className="animate-spin text-gray-400" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <EnvelopeSimple size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No broadcasts yet</h3>
            <p className="text-gray-500">Create your first email broadcast to reach your users.</p>
          </div>
        ) : (
          broadcasts.map((broadcast) => {
            const status = statusConfig[broadcast.status as keyof typeof statusConfig] || statusConfig.draft;
            const StatusIcon = status.icon;

            return (
              <div key={broadcast.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-gray-100 flex-shrink-0">
                      <EnvelopeSimple size={18} className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900">{broadcast.subject}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {broadcast.content.replace(/<[^>]*>/g, '').slice(0, 100)}...
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded', status.color)}>
                          <StatusIcon size={12} className={broadcast.status === 'sending' ? 'animate-spin' : ''} />
                          {status.label}
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
                            ? `Sent ${new Date(broadcast.sentAt).toLocaleDateString()}`
                            : `Created ${new Date(broadcast.createdAt).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteBroadcast(broadcast.id, broadcast.subject)}
                    className="btn btn-ghost text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 p-2"
                    title="Delete broadcast"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
