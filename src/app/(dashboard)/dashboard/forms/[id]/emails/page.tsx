'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  PaperPlaneTilt,
  Trash,
  Clock,
  Check,
  X,
  Warning,
  Spinner,
  MagnifyingGlass,
  FunnelSimple,
} from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Email {
  id: string;
  to: string;
  subject: string;
  status: string;
  scheduledFor: string;
  sentAt: string | null;
  createdAt: string;
  automationName: string;
}

export default function EmailLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: formId } = use(params);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');

  useEffect(() => {
    fetch(`/api/forms/${formId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.form) setFormName(data.form.name); })
      .catch(() => {});
  }, [formId]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/forms/${formId}/automations/emails?page=${page}&limit=20`)
      .then(res => res.ok ? res.json() : { emails: [] })
      .then(data => {
        setEmails(data.emails || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotal(data.pagination.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [formId, page]);

  const handleDelete = async (emailId: string) => {
    try {
      await fetch(`/api/forms/${formId}/automations/emails`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      });
      setEmails(prev => prev.filter(e => e.id !== emailId));
      setTotal(prev => prev - 1);
    } catch {}
  };

  const filteredEmails = emails.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.to.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.automationName.toLowerCase().includes(q);
    }
    return true;
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Check size={14} weight="bold" className="text-emerald-500" />;
      case 'pending': return <Clock size={14} className="text-amber-500" />;
      case 'failed': return <Warning size={14} className="text-red-500" />;
      case 'cancelled': return <X size={14} className="text-gray-400" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      sent: 'bg-emerald-50 text-emerald-700',
      pending: 'bg-amber-50 text-amber-700',
      failed: 'bg-red-50 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return styles[status] || 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/forms/${formId}`}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Email Log</h1>
          <p className="text-sm text-gray-500">{formName || 'Loading...'} &middot; {total} email{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, subject, or automation..."
            className="input w-full pl-9"
          />
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 shrink-0">
          {['all', 'sent', 'pending', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Email list */}
      {loading ? (
        <div className="card p-12 text-center">
          <Spinner size={24} className="animate-spin text-gray-400 mx-auto" />
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center">
          <PaperPlaneTilt size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {total === 0 ? 'No emails sent yet' : 'No emails match your filters'}
          </h3>
          <p className="text-sm text-gray-500">
            {total === 0
              ? 'Automation emails will appear here when forms are submitted.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {filteredEmails.map((email) => (
            <div key={email.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  {statusIcon(email.status)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{email.subject}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize shrink-0 ${statusBadge(email.status)}`}>
                      {email.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {email.to} &middot; {email.automationName} &middot;{' '}
                    {email.sentAt
                      ? new Date(email.sentAt).toLocaleString()
                      : email.status === 'pending'
                        ? `Scheduled: ${new Date(email.scheduledFor).toLocaleString()}`
                        : new Date(email.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingId(email.id)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0 ml-2"
              >
                <Trash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
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
        </div>
      )}

      <ConfirmModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          if (deletingId) await handleDelete(deletingId);
          setDeletingId(null);
        }}
        title="Delete Email Record"
        message="This email record will be permanently deleted. If pending, it will be cancelled."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
