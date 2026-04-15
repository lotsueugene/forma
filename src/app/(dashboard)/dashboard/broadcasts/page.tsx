'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaperPlaneTilt,
  Plus,
  Spinner,
  Check,
  X,
  EnvelopeSimple,
  Users,
  FunnelSimple,
  Clock,
  CheckCircle,
  WarningCircle,
  Trash,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/workspace-context';
import UpgradeModal from '@/components/dashboard/UpgradeModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import RichTextEditor from '@/components/ui/RichTextEditor';

interface FormOption {
  id: string;
  name: string;
}

interface Broadcast {
  id: string;
  subject: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  formId: string | null;
  form: { id: string; name: string } | null;
  sentAt: string | null;
  createdAt: string;
}

const roleLevel: Record<string, number> = { owner: 4, manager: 3, editor: 2, viewer: 1 };

export default function BroadcastsPage() {
  const { currentWorkspace } = useWorkspace();

  // Role guard: manager+ only
  const userRole = currentWorkspace?.role || 'viewer';
  if (roleLevel[userRole] < roleLevel['manager']) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500">You need manager or owner access to manage broadcasts.</p>
        </div>
      </div>
    );
  }
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [forms, setForms] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [planType, setPlanType] = useState('free');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [deletingBroadcastId, setDeletingBroadcastId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Compose state
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedForm, setSelectedForm] = useState('');
  const [fromName, setFromName] = useState('');
  const [previewRecipients, setPreviewRecipients] = useState<string[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) return;

    Promise.all([
      fetch(`/api/workspaces/${currentWorkspace.id}/broadcasts?page=${page}&limit=10`).then(r => r.ok ? r.json() : null),
      fetch(`/api/workspaces/${currentWorkspace.id}/custom-domain`).then(r => r.ok ? r.json() : null),
      fetch(`/api/workspaces/${currentWorkspace.id}/subscription`).then(r => r.ok ? r.json() : null),
    ]).then(([broadcastData, domainData, subData]) => {
      setBroadcasts(broadcastData?.broadcasts || []);
      setTotalPages(broadcastData?.totalPages || 1);
      setForms(domainData?.forms || []);
      if (subData?.subscription?.plan) setPlanType(subData.subscription.plan);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [currentWorkspace, page]);

  const handleCompose = () => {
    if (planType === 'free') {
      setShowUpgrade(true);
      return;
    }
    setShowCompose(true);
    setSubject('');
    setContent('');
    setSelectedForm('');
    setFromName('');
    setPreviewRecipients([]);
    setRecipientCount(0);
    setSent(false);
    setError('');
  };

  const handlePreview = async () => {
    if (!currentWorkspace) return;
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject || 'Preview',
          content: content || 'Preview',
          formId: selectedForm || null,
          previewOnly: true,
        }),
      });
      const data = await res.json();
      setRecipientCount(data.recipientCount || 0);
      setPreviewRecipients(data.recipients || []);
    } catch {
      setError('Failed to load recipients');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSend = async () => {
    if (!currentWorkspace || !subject.trim() || !content.trim()) {
      setError('Subject and content are required');
      return;
    }

    setSending(true);
    setError('');

    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          content,
          formId: selectedForm || null,
          fromName: fromName || null,
          sendNow: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');

      setSent(true);
      setRecipientCount(data.recipientCount);
      setPreviewRecipients(data.recipients || []);
      setBroadcasts(prev => [data.broadcast, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Broadcasts</h1>
          <p className="text-gray-600">Email your form respondents</p>
        </div>
        <button onClick={handleCompose} className="btn btn-primary">
          <Plus size={18} weight="bold" />
          New Broadcast
        </button>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !sending && setShowCompose(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {sent ? (
                /* Success state */
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-full flex items-center justify-center">
                    <CheckCircle size={32} className="text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Broadcast Sent</h2>
                  <p className="text-gray-600 mb-1">Sending to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}</p>
                  {previewRecipients.length > 0 && (
                    <p className="text-xs text-gray-400 mb-6">
                      {previewRecipients.slice(0, 5).join(', ')}
                      {recipientCount > 5 && ` and ${recipientCount - 5} more`}
                    </p>
                  )}
                  <button onClick={() => setShowCompose(false)} className="btn btn-primary">
                    Done
                  </button>
                </div>
              ) : (
                /* Compose form */
                <>
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-safety-orange/10 flex items-center justify-center">
                        <PaperPlaneTilt size={20} className="text-safety-orange" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">New Broadcast</h2>
                        <p className="text-sm text-gray-500">Email your form respondents</p>
                      </div>
                    </div>
                    <button onClick={() => setShowCompose(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                        <WarningCircle size={16} />
                        {error}
                      </div>
                    )}

                    {/* Filter by form */}
                    <div className="form-field">
                      <label className="form-label flex items-center gap-2">
                        <FunnelSimple size={14} />
                        Send to respondents of
                      </label>
                      <select
                        value={selectedForm}
                        onChange={(e) => setSelectedForm(e.target.value)}
                        className="input"
                      >
                        <option value="">All forms</option>
                        {forms.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* From name */}
                    <div className="form-field">
                      <label className="form-label">From Name</label>
                      <input
                        type="text"
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        className="input"
                        placeholder={currentWorkspace?.name || 'Your workspace name'}
                      />
                    </div>

                    {/* Subject */}
                    <div className="form-field">
                      <label className="form-label">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="input"
                        placeholder="e.g. Thanks for your submission!"
                      />
                    </div>

                    {/* Content */}
                    <div className="form-field">
                      <label className="form-label">Message</label>
                      <RichTextEditor
                        value={content}
                        onChange={setContent}
                        placeholder="Hi {{name}}, thanks for your submission!"
                        rows={8}
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs text-gray-400">Personalization:</span>
                        {['{{name}}', '{{email}}'].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setContent(prev => prev + tag)}
                            className="text-xs px-2 py-0.5 bg-safety-orange/10 text-safety-orange rounded-full hover:bg-safety-orange/20 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Recipient preview */}
                    {recipientCount > 0 && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Users size={14} className="text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">{recipientCount} recipient{recipientCount !== 1 ? 's' : ''}</span>
                        </div>
                        {previewRecipients.length > 0 && (
                          <p className="text-xs text-gray-400 truncate">
                            {previewRecipients.slice(0, 5).join(', ')}
                            {recipientCount > 5 && ` +${recipientCount - 5} more`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                    <button onClick={() => setShowCompose(false)} className="btn btn-ghost">
                      Cancel
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePreview}
                        disabled={loadingPreview}
                        className="btn btn-secondary"
                      >
                        {loadingPreview ? <Spinner size={16} className="animate-spin" /> : <Users size={16} />}
                        Preview Recipients
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={sending || !subject.trim() || !content.trim()}
                        className="btn btn-primary disabled:opacity-50"
                      >
                        {sending ? (
                          <>
                            <Spinner size={16} className="animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <PaperPlaneTilt size={16} />
                            Send Broadcast
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcasts list */}
      {broadcasts.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center">
          <EnvelopeSimple size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No broadcasts yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Send emails to people who submitted your forms. Great for follow-ups, updates, and announcements.
          </p>
          <button onClick={handleCompose} className="btn btn-primary">
            <Plus size={16} />
            Send Your First Broadcast
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((broadcast) => (
            <div key={broadcast.id} className="card p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  broadcast.status === 'sent' ? 'bg-emerald-50' :
                  broadcast.status === 'sending' ? 'bg-amber-50' :
                  broadcast.status === 'failed' ? 'bg-red-50' :
                  'bg-gray-50'
                )}>
                  {broadcast.status === 'sent' ? <Check size={18} className="text-emerald-600" /> :
                   broadcast.status === 'sending' ? <Spinner size={18} className="text-amber-600 animate-spin" /> :
                   broadcast.status === 'failed' ? <WarningCircle size={18} className="text-red-600" /> :
                   <EnvelopeSimple size={18} className="text-gray-400" />}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{broadcast.subject}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {broadcast.sentCount}/{broadcast.recipientCount} sent
                    </span>
                    {broadcast.form && (
                      <span className="flex items-center gap-1">
                        <FunnelSimple size={12} />
                        {broadcast.form.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {broadcast.sentAt ? new Date(broadcast.sentAt).toLocaleDateString() : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  'badge',
                  broadcast.status === 'sent' ? 'badge-success' :
                  broadcast.status === 'sending' ? 'badge-warning' :
                  broadcast.status === 'failed' ? 'badge-error' :
                  'bg-gray-100 text-gray-600'
                )}>
                  {broadcast.status}
                </span>
                <button
                  type="button"
                  onClick={() => setDeletingBroadcastId(broadcast.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pg: number;
            if (totalPages <= 5) pg = i + 1;
            else if (page <= 3) pg = i + 1;
            else if (page >= totalPages - 2) pg = totalPages - 4 + i;
            else pg = page - 2 + i;
            return (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${
                  pg === page ? 'bg-safety-orange text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {pg}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      )}

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="Respondent broadcasts"
      />

      <ConfirmModal
        open={!!deletingBroadcastId}
        onClose={() => setDeletingBroadcastId(null)}
        onConfirm={async () => {
          if (!deletingBroadcastId) return;
          try {
            await fetch(`/api/workspaces/${currentWorkspace?.id}/broadcasts`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ broadcastId: deletingBroadcastId }),
            });
            setBroadcasts(prev => prev.filter(b => b.id !== deletingBroadcastId));
          } catch {}
          setDeletingBroadcastId(null);
        }}
        title="Delete Broadcast"
        message="This broadcast record will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
