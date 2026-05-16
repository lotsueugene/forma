'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import {
  Plus,
  Spinner,
  EnvelopeSimple,
  PaperPlaneTilt,
  Trash,
  ChatCircle,
  ArrowLeft,
  User,
  EnvelopeOpen,
  MagnifyingGlass,
  X,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Checkbox } from '@/components/ui/Checkbox';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface PickableUser {
  id: string;
  email: string | null;
  name: string | null;
}

type TargetMode = 'all' | 'plans' | 'users';

// Broadcast list interface lives in /admin/broadcasts/history (its only consumer).

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

// statusConfig moved to /admin/broadcasts/history alongside the broadcast list.

const replyStatusConfig = {
  unread: { color: 'bg-orange-100 text-orange-600', label: 'New' },
  read: { color: 'bg-gray-100 text-gray-600', label: 'Read' },
  replied: { color: 'bg-emerald-100 text-emerald-600', label: 'Replied' },
};

export default function AdminBroadcastsPage() {
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'replies'>('broadcasts');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Replies state
  const [replies, setReplies] = useState<Reply[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [selectedReply, setSelectedReply] = useState<Reply | null>(null);
  const [responseText, setResponseText] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'default';
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    targetMode: 'all' as TargetMode,
    targetPlans: '',
    sendNow: false,
  });

  // Specific-user targeting picker. Selected users persist on `formData` via
  // selectedUsers; debounced search hits /api/admin/users?search=… and shows
  // up to 8 matches in a dropdown.
  const [selectedUsers, setSelectedUsers] = useState<PickableUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<PickableUser[]>([]);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const userSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formData.targetMode !== 'users' || userSearch.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/admin/users?search=${encodeURIComponent(userSearch.trim())}&limit=8`)
        .then((r) => r.json())
        .then((data) => {
          const selectedIds = new Set(selectedUsers.map((u) => u.id));
          setUserSearchResults(
            (data.users || []).filter((u: PickableUser) => !selectedIds.has(u.id))
          );
        })
        .catch((e) => console.error('User search failed:', e));
    }, 220);
    return () => clearTimeout(timer);
  }, [userSearch, formData.targetMode, selectedUsers]);

  // Close the search dropdown when clicking outside.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userSearchRef.current && !userSearchRef.current.contains(e.target as Node)) {
        setUserSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    loadReplies();
  }, []);

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

  const submitBroadcast = async () => {
    if (formData.targetMode === 'users' && selectedUsers.length === 0) {
      // Belt-and-suspenders — UI disables submit in this state too.
      return;
    }
    setSaving(true);

    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          content: formData.content,
          sendNow: formData.sendNow,
          targetAll: formData.targetMode === 'all',
          targetPlans: formData.targetMode === 'plans' ? formData.targetPlans : null,
          targetUserIds: formData.targetMode === 'users' ? selectedUsers.map((u) => u.id) : null,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({
          subject: '',
          content: '',
          targetMode: 'all',
          targetPlans: '',
          sendNow: false,
        });
        setSelectedUsers([]);
        setUserSearch('');
      }
    } catch (error) {
      console.error('Failed to create broadcast:', error);
    } finally {
      setSaving(false);
    }
  };

  const createBroadcast = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.sendNow) {
      setConfirmAction({
        title: 'Send Broadcast Now',
        message: 'Are you sure you want to send this email broadcast immediately? This cannot be undone.',
        confirmText: 'Send Now',
        variant: 'danger',
        onConfirm: submitBroadcast,
      });
      return;
    }

    submitBroadcast();
  };

  // Delete handlers moved to /admin/broadcasts/history page.

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

  const deleteReply = (id: string) => {
    setConfirmAction({
      title: 'Delete Reply',
      message: 'Delete this reply?',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
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
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Email Broadcasts</h1>
          <p className="text-gray-600">Send marketing emails and manage replies</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/broadcasts/history"
            className="btn btn-ghost p-2"
            title="Broadcast history"
            aria-label="Broadcast history"
          >
            <ClockCounterClockwise size={18} />
          </Link>
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
                <RichTextEditor
                  value={formData.content}
                  onChange={(val) => setFormData({ ...formData, content: val })}
                  placeholder="Hi {{name}}, we're excited to share some updates with you!"
                  rows={8}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Just type your message. It will be automatically styled with the Forma email template.
                </p>
              </div>

              {/* Audience picker — three mutually exclusive modes */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Audience</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: 'all',   label: 'All users' },
                    { id: 'plans', label: 'By plan' },
                    { id: 'users', label: 'Specific users' },
                  ] as { id: TargetMode; label: string }[]).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetMode: opt.id })}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                        formData.targetMode === opt.id
                          ? 'bg-safety-orange/10 border-safety-orange text-safety-orange'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.targetMode === 'plans' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Target Plans</label>
                  <input
                    type="text"
                    value={formData.targetPlans}
                    onChange={(e) => setFormData({ ...formData, targetPlans: e.target.value })}
                    className="input w-full"
                    placeholder="free,trial,pro"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated plan slugs. Empty matches nothing.</p>
                </div>
              )}

              {formData.targetMode === 'users' && (
                <div ref={userSearchRef}>
                  <label className="block text-sm text-gray-600 mb-1">Recipients</label>

                  {/* Selected chips */}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedUsers.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md bg-gray-100 text-xs"
                        >
                          <User size={12} className="text-gray-500" />
                          <span className="text-gray-700">{u.email || u.name || u.id}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedUsers(selectedUsers.filter((s) => s.id !== u.id))
                            }
                            className="text-gray-400 hover:text-red-600 p-0.5"
                            aria-label="Remove recipient"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search input + results dropdown */}
                  <div className="relative">
                    <div className="relative">
                      <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => {
                          setUserSearch(e.target.value);
                          setUserSearchOpen(true);
                        }}
                        onFocus={() => setUserSearchOpen(true)}
                        placeholder="Search by email or name..."
                        className="input w-full pl-9"
                      />
                    </div>
                    {userSearchOpen && userSearchResults.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {userSearchResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUsers([...selectedUsers, u]);
                              setUserSearch('');
                              setUserSearchResults([]);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="text-sm text-gray-900">{u.email || '(no email)'}</div>
                            {u.name && <div className="text-xs text-gray-500">{u.name}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedUsers.length === 0
                      ? 'Pick at least one user. Search by email or name.'
                      : `${selectedUsers.length} recipient${selectedUsers.length === 1 ? '' : 's'} selected`}
                  </p>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Checkbox
                  checked={formData.sendNow}
                  onChange={(e) => setFormData({ ...formData, sendNow: e.target.checked })}
                  label={<span className="text-amber-800">Send immediately</span>}
                  description={<span className="text-amber-700">This cannot be undone</span>}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    saving ||
                    (formData.targetMode === 'users' && selectedUsers.length === 0) ||
                    (formData.targetMode === 'plans' && !formData.targetPlans.trim())
                  }
                >
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

          {/* Past-broadcasts list moved to /admin/broadcasts/history.
              The clock icon in the header is the entry point. */}
          {!showForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <EnvelopeSimple size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Compose a new broadcast</h3>
              <p className="text-gray-500 mb-4">
                Send an email to all users, a plan tier, or specific recipients.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setShowForm(true)} className="btn btn-primary">
                  <Plus size={16} />
                  New Broadcast
                </button>
                <Link href="/admin/broadcasts/history" className="btn btn-ghost">
                  <ClockCounterClockwise size={16} />
                  View History
                </Link>
              </div>
            </div>
          )}
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
                    reply.status === 'unread' && 'border-orange-200 bg-orange-50/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'p-2 rounded-lg flex-shrink-0',
                        reply.status === 'unread' ? 'bg-orange-100' : 'bg-gray-100'
                      )}>
                        {reply.status === 'unread' ? (
                          <EnvelopeSimple size={18} className="text-orange-600" />
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
                            {reply.fromName && reply.fromName.length > 2 ? reply.fromName : reply.fromEmail}
                          </h3>
                          <span className={cn('text-xs px-2 py-0.5 rounded', status.color)}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{reply.subject}</p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {reply.textContent?.slice(0, 100) || reply.htmlContent?.replace(/<[^>]*>/g, '').slice(0, 100) || 'View on Resend to see content'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{reply.fromEmail}</span>
                          <span>{new Date(reply.receivedAt).toLocaleString()}</span>
                          {reply.broadcast && (
                            <span className="text-gray-500">Re: {reply.broadcast.subject}</span>
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

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmText={confirmAction?.confirmText || 'Confirm'}
        variant={confirmAction?.variant || 'default'}
        onConfirm={async () => { await confirmAction?.onConfirm(); setConfirmAction(null); }}
        onClose={() => setConfirmAction(null)}
      />

      {/* Reply Detail Modal */}
      {selectedReply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setSelectedReply(null)}
                  className="btn btn-ghost p-2"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 className="font-semibold text-gray-900 flex-1">{selectedReply.subject}</h3>
                {selectedReply.status === 'replied' && (
                  <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-600 rounded">
                    Replied
                  </span>
                )}
              </div>
              <div className="ml-11 space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="text-gray-500">From:</span>{' '}
                  {selectedReply.fromName && selectedReply.fromName.length > 2 ? (
                    <>
                      <span className="font-medium">{selectedReply.fromName}</span>{' '}
                      <span className="text-gray-500">&lt;{selectedReply.fromEmail}&gt;</span>
                    </>
                  ) : (
                    <span className="font-medium">{selectedReply.fromEmail}</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(selectedReply.receivedAt).toLocaleString()}
                </p>
                {selectedReply.broadcast && (
                  <p className="text-sm">
                    <span className="text-gray-500">Replying to:</span>{' '}
                    <span className="text-orange-600 font-medium">{selectedReply.broadcast.subject}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4">
                {selectedReply.htmlContent ? (
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedReply.htmlContent, { ALLOWED_TAGS: ['p', 'br', 'a', 'strong', 'em', 'u', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'span', 'div', 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody'], ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'style', 'class'] }) }} />
                ) : selectedReply.textContent ? (
                  <p className="whitespace-pre-wrap m-0">{selectedReply.textContent}</p>
                ) : (
                  <p className="text-gray-500 m-0">
                    Search for <span className="font-medium text-gray-700">{selectedReply.fromEmail}</span> on{' '}
                    <a href="https://resend.com/emails/receiving" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                      Resend
                    </a>{' '}
                    to view the message content.
                  </p>
                )}
              </div>

              {selectedReply.replyContent && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">
                    Your response · {new Date(selectedReply.repliedAt!).toLocaleString()}
                  </p>
                  <div className="p-4 bg-emerald-50 rounded-lg text-sm whitespace-pre-wrap">
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
