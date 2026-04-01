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
  ChatCircle,
  ArrowLeft,
  User,
  EnvelopeOpen,
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

interface Reply {
  id: string;
  broadcastId: string | null;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  textContent: string | null;
  htmlContent: string | null;
  status: string;
  readAt: string | null;
  repliedAt: string | null;
  replyContent: string | null;
  receivedAt: string;
  broadcast: {
    id: string;
    subject: string;
  } | null;
}

const statusConfig = {
  draft: { icon: Clock, color: 'bg-gray-100 text-gray-600', label: 'Draft' },
  sending: { icon: Spinner, color: 'bg-blue-100 text-blue-600', label: 'Sending' },
  sent: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600', label: 'Sent' },
  failed: { icon: XCircle, color: 'bg-red-100 text-red-600', label: 'Failed' },
};

const replyStatusConfig = {
  unread: { color: 'bg-blue-100 text-blue-600', label: 'New' },
  read: { color: 'bg-gray-100 text-gray-600', label: 'Read' },
  replied: { color: 'bg-emerald-100 text-emerald-600', label: 'Replied' },
};

export default function AdminBroadcastsPage() {
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'replies'>('broadcasts');
  const [loading, setLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Replies state
  const [replies, setReplies] = useState<Reply[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [selectedReply, setSelectedReply] = useState<Reply | null>(null);
  const [responseText, setResponseText] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ id: string; subject: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    targetAll: true,
    targetPlans: '',
    sendNow: false,
  });

  useEffect(() => {
    loadBroadcasts();
    loadReplies();
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

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await fetch('/api/admin/broadcasts/replies');
      const data = await res.json();
      setReplies(data.replies || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load replies:', error);
    } finally {
      setLoadingReplies(false);
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

  const openDeleteModal = (id: string, subject: string) => {
    setDeleteModal({ id, subject });
    setDeleteConfirmation('');
  };

  const closeDeleteModal = () => {
    setDeleteModal(null);
    setDeleteConfirmation('');
    setDeleting(false);
  };

  const confirmDelete = async () => {
    if (!deleteModal || deleteConfirmation !== 'DELETE') return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/broadcasts/${deleteModal.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setBroadcasts(broadcasts.filter(b => b.id !== deleteModal.id));
        closeDeleteModal();
      }
    } catch (error) {
      console.error('Failed to delete broadcast:', error);
    } finally {
      setDeleting(false);
    }
  };

  const openReply = async (reply: Reply) => {
    setSelectedReply(reply);
    setResponseText('');

    // Mark as read
    if (reply.status === 'unread') {
      try {
        await fetch(`/api/admin/broadcasts/replies/${reply.id}`);
        setReplies(replies.map(r =>
          r.id === reply.id ? { ...r, status: 'read', readAt: new Date().toISOString() } : r
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const sendResponse = async () => {
    if (!selectedReply || !responseText.trim()) return;

    setSendingResponse(true);
    try {
      const res = await fetch(`/api/admin/broadcasts/replies/${selectedReply.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: responseText }),
      });

      if (res.ok) {
        setReplies(replies.map(r =>
          r.id === selectedReply.id
            ? { ...r, status: 'replied', repliedAt: new Date().toISOString(), replyContent: responseText }
            : r
        ));
        setSelectedReply(null);
        setResponseText('');
      }
    } catch (error) {
      console.error('Failed to send response:', error);
    } finally {
      setSendingResponse(false);
    }
  };

  const deleteReply = async (id: string) => {
    if (!confirm('Delete this reply?')) return;

    try {
      const res = await fetch(`/api/admin/broadcasts/replies/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setReplies(replies.filter(r => r.id !== id));
        if (selectedReply?.id === id) {
          setSelectedReply(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete reply:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Email Broadcasts</h1>
          <p className="text-gray-600">Send marketing emails and manage replies</p>
        </div>
        {activeTab === 'broadcasts' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            New Broadcast
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('broadcasts')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            activeTab === 'broadcasts'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <EnvelopeSimple size={16} className="inline mr-2" />
          Broadcasts
        </button>
        <button
          onClick={() => setActiveTab('replies')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors relative',
            activeTab === 'replies'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <ChatCircle size={16} className="inline mr-2" />
          Replies
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'broadcasts' ? (
        <>
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
                  Message (use {"{{name}}"} to personalize with user&apos;s name)
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
                        onClick={() => openDeleteModal(broadcast.id, broadcast.subject)}
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
        </>
      ) : (
        /* Replies Tab */
        <div className="space-y-3">
          {loadingReplies ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size={24} className="animate-spin text-gray-400" />
            </div>
          ) : replies.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <ChatCircle size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No replies yet</h3>
              <p className="text-gray-500">When users reply to your broadcasts, they&apos;ll appear here.</p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left text-sm">
                <p className="font-medium text-gray-700 mb-2">Setup required:</p>
                <ol className="list-decimal list-inside text-gray-600 space-y-1">
                  <li>Add MX record in your DNS pointing to Resend</li>
                  <li>Configure inbound webhook in Resend dashboard</li>
                  <li>Webhook URL: <code className="bg-gray-200 px-1 rounded">https://withforma.io/api/webhooks/resend-inbound</code></li>
                </ol>
              </div>
            </div>
          ) : (
            replies.map((reply) => {
              const status = replyStatusConfig[reply.status as keyof typeof replyStatusConfig] || replyStatusConfig.read;

              return (
                <div
                  key={reply.id}
                  onClick={() => openReply(reply)}
                  className={cn(
                    'bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 transition-colors',
                    reply.status === 'unread' && 'border-blue-200 bg-blue-50/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'p-2 rounded-lg flex-shrink-0',
                        reply.status === 'unread' ? 'bg-blue-100' : 'bg-gray-100'
                      )}>
                        {reply.status === 'unread' ? (
                          <EnvelopeSimple size={18} className="text-blue-600" />
                        ) : (
                          <EnvelopeOpen size={18} className="text-gray-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={cn(
                            'font-medium',
                            reply.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                          )}>
                            {reply.fromName || reply.fromEmail}
                          </h3>
                          <span className={cn('text-xs px-2 py-0.5 rounded', status.color)}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{reply.subject}</p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {reply.textContent?.slice(0, 100) || '(No text content)'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{reply.fromEmail}</span>
                          <span>{new Date(reply.receivedAt).toLocaleString()}</span>
                          {reply.broadcast && (
                            <span className="text-blue-600">Re: {reply.broadcast.subject}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReply(reply.id);
                      }}
                      className="btn btn-ghost text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 p-2"
                      title="Delete reply"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Broadcast</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete &quot;{deleteModal.subject}&quot;?
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Type <span className="font-bold text-red-600">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="input w-full mb-4"
              placeholder="Type DELETE here"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={closeDeleteModal}
                className="btn btn-ghost"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmation !== 'DELETE' || deleting}
                className="btn bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? <Spinner size={16} className="animate-spin" /> : <Trash size={16} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply Detail Modal */}
      {selectedReply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-3">
              <button
                onClick={() => setSelectedReply(null)}
                className="btn btn-ghost p-2"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{selectedReply.subject}</h3>
                <p className="text-sm text-gray-500">
                  From: {selectedReply.fromName || selectedReply.fromEmail}
                </p>
              </div>
              {selectedReply.status === 'replied' && (
                <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-600 rounded">
                  Replied
                </span>
              )}
            </div>

            {/* Content */}
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <User size={14} />
                <span>{selectedReply.fromEmail}</span>
                <span>·</span>
                <span>{new Date(selectedReply.receivedAt).toLocaleString()}</span>
              </div>

              {selectedReply.broadcast && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="text-gray-500">In reply to:</span>{' '}
                  <span className="text-gray-700">{selectedReply.broadcast.subject}</span>
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                {selectedReply.htmlContent ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedReply.htmlContent }} />
                ) : (
                  <p className="whitespace-pre-wrap">{selectedReply.textContent}</p>
                )}
              </div>

              {selectedReply.replyContent && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Your response ({new Date(selectedReply.repliedAt!).toLocaleString()}):</p>
                  <div className="p-3 bg-emerald-50 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedReply.replyContent}
                  </div>
                </div>
              )}
            </div>

            {/* Response Form */}
            {selectedReply.status !== 'replied' && (
              <div className="p-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send Response
                </label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="input w-full h-32 mb-3"
                  placeholder="Type your response..."
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setSelectedReply(null)}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendResponse}
                    disabled={!responseText.trim() || sendingResponse}
                    className="btn btn-primary disabled:opacity-50"
                  >
                    {sendingResponse ? (
                      <Spinner size={16} className="animate-spin" />
                    ) : (
                      <PaperPlaneTilt size={16} />
                    )}
                    Send Response
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
