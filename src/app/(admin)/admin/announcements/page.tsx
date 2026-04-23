'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Spinner,
  Megaphone,
  Trash,
  CheckCircle,
  Warning,
  Info,
  Star,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: number;
  targetAll: boolean;
  targetPlans: string | null;
  dismissible: boolean;
  showBanner: boolean;
  showModal: boolean;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
}

const typeIcons = {
  info: Info,
  warning: Warning,
  success: CheckCircle,
  update: Star,
};

const typeColors = {
  info: 'bg-safety-orange/10 text-safety-orange',
  warning: 'bg-amber-500/10 text-amber-600',
  success: 'bg-emerald-500/10 text-emerald-600',
  update: 'bg-safety-orange/10 text-safety-orange',
};

export default function AdminAnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string; message: string; confirmText: string;
    variant: 'danger' | 'warning' | 'default'; onConfirm: () => Promise<void>;
  } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    priority: 0,
    targetAll: true,
    targetPlans: '',
    dismissible: true,
    showBanner: true,
    showModal: false,
    expiresAt: '',
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements');
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          targetPlans: formData.targetAll ? null : formData.targetPlans,
          expiresAt: formData.expiresAt || null,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({
          title: '',
          content: '',
          type: 'info',
          priority: 0,
          targetAll: true,
          targetPlans: '',
          dismissible: true,
          showBanner: true,
          showModal: false,
          expiresAt: '',
        });
        loadAnnouncements();
      }
    } catch (error) {
      console.error('Failed to create announcement:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteAnnouncement = (id: string, title: string) => {
    setConfirmAction({
      title: 'Delete Announcement',
      message: `Are you sure you want to delete "${title}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/announcements/${id}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            setAnnouncements(announcements.filter(a => a.id !== id));
          }
        } catch (error) {
          console.error('Failed to delete announcement:', error);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Announcements</h1>
          <p className="text-gray-600 text-sm">Create in-app announcements for users</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary w-fit"
        >
          <Plus size={16} />
          New Announcement
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={createAnnouncement} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Create Announcement</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Type</label>
              <Select
                value={formData.type}
                onChange={(v) => setFormData({ ...formData, type: v })}
                options={[
                  { value: 'info', label: 'Info' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'success', label: 'Success' },
                  { value: 'update', label: 'Update' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Content (Markdown supported)</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input w-full h-32"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Priority (higher = more important)</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="input w-full"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm text-gray-600 mb-1">Target Plans (if not all)</label>
              <input
                type="text"
                value={formData.targetPlans}
                onChange={(e) => setFormData({ ...formData, targetPlans: e.target.value })}
                className="input w-full"
                placeholder="free,trial,pro"
                disabled={formData.targetAll}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <Checkbox
              checked={formData.targetAll}
              onChange={(e) => setFormData({ ...formData, targetAll: e.target.checked })}
              label="Target all users"
            />
            <Checkbox
              checked={formData.dismissible}
              onChange={(e) => setFormData({ ...formData, dismissible: e.target.checked })}
              label="Dismissible"
            />
            <Checkbox
              checked={formData.showBanner}
              onChange={(e) => setFormData({ ...formData, showBanner: e.target.checked })}
              label="Show as banner"
            />
            <Checkbox
              checked={formData.showModal}
              onChange={(e) => setFormData({ ...formData, showModal: e.target.checked })}
              label="Show as modal"
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Spinner size={16} className="animate-spin" /> : <Plus size={16} />}
              Create Announcement
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

      {/* Announcements List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size={24} className="animate-spin text-gray-500" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
            <p className="text-gray-500">Create your first announcement to notify users.</p>
          </div>
        ) : (
          announcements.map((announcement) => {
            const TypeIcon = typeIcons[announcement.type as keyof typeof typeIcons] || Info;
            const typeColor = typeColors[announcement.type as keyof typeof typeColors] || typeColors.info;
            const isActive = new Date(announcement.startsAt) <= new Date() &&
              (!announcement.expiresAt || new Date(announcement.expiresAt) > new Date());

            return (
              <div key={announcement.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn('p-2 rounded-lg flex-shrink-0', typeColor)}>
                      <TypeIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900 truncate">{announcement.title}</h3>
                        {isActive ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 flex-shrink-0">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600 flex-shrink-0">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {announcement.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                        <span>Priority: {announcement.priority}</span>
                        <span>{announcement.showBanner ? 'Banner' : ''} {announcement.showModal ? 'Modal' : ''}</span>
                        <span className="hidden sm:inline">Created: {new Date(announcement.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAnnouncement(announcement.id, announcement.title)}
                    className="btn btn-ghost text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 p-2"
                    title="Delete announcement"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmText={confirmAction?.confirmText || 'Confirm'}
        variant={confirmAction?.variant || 'default'}
        onConfirm={async () => { await confirmAction?.onConfirm(); setConfirmAction(null); }}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
