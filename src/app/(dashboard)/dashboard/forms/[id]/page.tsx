'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  PencilSimple,
  Copy,
  Trash,
  Eye,
  Code,
  ChartLineUp,
  EnvelopeSimple,
  Export,
  FunnelSimple,
  MagnifyingGlass,
  CaretDown,
  Check,
  X,
  ArrowSquareOut,
  WebhooksLogo,
  Spinner,
  Link as LinkIcon,
  Play,
  Pause,
  Archive,
  DotsThree,
  Gear,
  WhatsappLogo,
  LinkedinLogo,
  QrCode,
  Stack,
  Clock,
  CalendarCheck,
} from '@phosphor-icons/react';
import QRCode from 'react-qr-code';
import { cn } from '@/lib/utils';
import FormAnalytics from '@/components/dashboard/FormAnalytics';
import BookingsView from '@/components/dashboard/BookingsView';
import { useWorkspace } from '@/contexts/workspace-context';
import FormSettingsPanel from '@/components/dashboard/FormSettings';

interface Form {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  status: string;
  formType: string;
  fields: Array<{ id: string; label: string; type: string; defaultValue?: string }>;
  settings: Record<string, unknown> | null;
  submissions: number;
  views: number;
  createdAt: string;
}

interface Submission {
  id: string;
  data: Record<string, string | string[]>;
  metadata: { userAgent?: string; ip?: string; submittedAt?: string; payment?: { status: string; amount: number; currency: string; stripeSessionId?: string; paidAt?: string } } | null;
  createdAt: string;
}

type Tab = 'submissions' | 'bookings' | 'analytics' | 'settings';

export default function FormDetailPage() {
  const params = useParams();
  const formId = params.id as string;
  const { currentWorkspace } = useWorkspace();

  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<Tab>('submissions');
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [slugInput, setSlugInput] = useState('');
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [slugError, setSlugError] = useState('');

  // Filter submissions based on search query
  const filteredSubmissions = submissions.filter((submission) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    // Search across all field values
    return Object.values(submission.data).some((value) => {
      const strValue = Array.isArray(value) ? value.join(' ') : String(value || '');
      return strValue.toLowerCase().includes(query);
    });
  });

  // Export functions
  const exportToCSV = () => {
    if (!form || filteredSubmissions.length === 0) return;

    // Get all unique column names
    const columnSet = new Set<string>();
    filteredSubmissions.forEach((sub) => {
      Object.keys(sub.data).forEach((key) => columnSet.add(key));
    });
    const columns = ['id', 'createdAt', ...Array.from(columnSet)];

    // Build CSV content
    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    // Map field IDs to labels
    const fieldLabels = new Map<string, string>();
    form.fields.forEach((field: { id: string; label: string }) => {
      fieldLabels.set(field.id, field.label);
    });
    const header = columns.map((col) => escapeCSV(
      col === 'id' ? 'Submission ID' :
      col === 'createdAt' ? 'Submitted At' :
      fieldLabels.get(col) || col
    )).join(',');
    const rows = filteredSubmissions.map((sub) => {
      return columns.map((col) => {
        if (col === 'id') return escapeCSV(sub.id);
        if (col === 'createdAt') return escapeCSV(new Date(sub.createdAt).toISOString());
        const value = sub.data[col];
        if (value === undefined || value === null) return '';
        if (Array.isArray(value)) return escapeCSV(value.join('; '));
        return escapeCSV(String(value));
      }).join(',');
    });

    const csv = [header, ...rows].join('\n');
    downloadFile(csv, `${form.name}-submissions.csv`, 'text/csv');
    setShowExportMenu(false);
  };

  const exportToJSON = () => {
    if (!form || filteredSubmissions.length === 0) return;

    const data = filteredSubmissions.map((sub) => ({
      id: sub.id,
      createdAt: sub.createdAt,
      data: sub.data,
      metadata: sub.metadata,
    }));

    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `${form.name}-submissions.json`, 'application/json');
    setShowExportMenu(false);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get the base URL for endpoints
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const formPageUrl = `${baseUrl}/f/${formId}`;
  const apiEndpoint = `${baseUrl}/api/forms/${formId}/submissions`;

  useEffect(() => {
    fetchFormData();
  }, [formId]);

  // Fetch workspace plan for QR branding
  useEffect(() => {
    if (!currentWorkspace) return;
    fetch(`/api/workspaces/${currentWorkspace.id}/subscription`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.subscription?.plan) setPlanType(data.subscription.plan); })
      .catch(() => {});
  }, [currentWorkspace]);

  const fetchFormData = async () => {
    try {
      // Fetch form details
      const formResponse = await fetch(`/api/forms/${formId}`);
      const formData = await formResponse.json();

      if (!formResponse.ok) {
        setError(formData.error || 'Form not found');
        setIsLoading(false);
        return;
      }

      setForm(formData.form);
      setSlugInput(formData.form.slug || '');

      // Fetch submissions
      const submissionsResponse = await fetch(`/api/forms/${formId}/submissions`);
      const submissionsData = await submissionsResponse.json();

      if (submissionsResponse.ok) {
        setSubmissions(submissionsData.submissions || []);
      }
    } catch (err) {
      setError('Failed to load form');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [planType, setPlanType] = useState<string>('free');
  const [isDeletingSubs, setIsDeletingSubs] = useState(false);
  const [showDeleteSubsConfirm, setShowDeleteSubsConfirm] = useState(false);
  const showQrBranding = planType === 'free';

  const updateFormStatus = async (newStatus: string) => {
    if (!form) return;
    const wasPublishing = form.status === 'draft' && newStatus === 'active';
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setForm({ ...form, status: data.form.status });
        if (wasPublishing) {
          setShowPublishModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
      setShowStatusMenu(false);
    }
  };

  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!form) return;
    setIsDuplicating(true);
    setShowMoreMenu(false);
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${form.name} (Copy)`,
          description: form.description,
          fields: form.fields,
          settings: form.settings,
          status: 'draft',
          workspaceId: currentWorkspace?.id,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = `/dashboard/forms/${data.form.id}`;
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to duplicate form');
      }
    } catch {
      alert('Failed to duplicate form');
    } finally {
      setIsDuplicating(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        window.location.href = '/dashboard/forms';
      } else {
        const data = await response.json();
        setShowDeleteModal(false);
        alert(data.error || 'Failed to delete form');
      }
    } catch (err) {
      setShowDeleteModal(false);
      alert('Failed to delete form');
    } finally {
      setIsDeleting(false);
    }
  };

  const saveSlug = async () => {
    if (!form) return;

    // Validate slug format
    const slug = slugInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (slug && slug.length < 2) {
      setSlugError('Slug must be at least 2 characters');
      return;
    }

    setIsSavingSlug(true);
    setSlugError('');
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug || null }),
      });

      const data = await response.json();
      if (response.ok) {
        setForm({ ...form, slug: data.form.slug });
        setSlugInput(data.form.slug || '');
      } else {
        setSlugError(data.error || 'Failed to save slug');
      }
    } catch (err) {
      setSlugError('Failed to save slug');
    } finally {
      setIsSavingSlug(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedSubmissions.length === filteredSubmissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(filteredSubmissions.map((s) => s.id));
    }
  };

  const toggleSubmission = (id: string) => {
    if (selectedSubmissions.includes(id)) {
      setSelectedSubmissions(selectedSubmissions.filter((s) => s !== id));
    } else {
      setSelectedSubmissions([...selectedSubmissions, id]);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size={32} className="text-safety-orange animate-spin" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Form not found</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href="/dashboard/forms" className="btn btn-primary">
          Back to Forms
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard/forms"
            className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{form.name}</h1>
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  disabled={isUpdatingStatus}
                  className={cn(
                    'badge cursor-pointer flex items-center gap-1 hover:opacity-80 transition-opacity',
                    form.status === 'active' ? 'badge-success' :
                    form.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                    form.status === 'archived' ? 'bg-gray-100 text-gray-600' :
                    'badge-warning'
                  )}
                >
                  {isUpdatingStatus ? (
                    <Spinner size={12} className="animate-spin" />
                  ) : (
                    <>
                      {form.status}
                      <CaretDown size={12} />
                    </>
                  )}
                </button>
                <AnimatePresence>
                  {showStatusMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20"
                      >
                        {form.status !== 'active' && (
                          <button
                            onClick={() => updateFormStatus('active')}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Play size={16} className="text-emerald-600" />
                            {form.status === 'draft' ? 'Publish' : 'Resume'}
                          </button>
                        )}
                        {form.status === 'active' && (
                          <button
                            onClick={() => updateFormStatus('paused')}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Pause size={16} className="text-amber-600" />
                            Pause
                          </button>
                        )}
                        {form.status !== 'draft' && (
                          <button
                            onClick={() => updateFormStatus('draft')}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                          >
                            <PencilSimple size={16} className="text-gray-500" />
                            Unpublish (Draft)
                          </button>
                        )}
                        {form.status !== 'archived' && (
                          <button
                            onClick={() => updateFormStatus('archived')}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                          >
                            <Archive size={16} className="text-gray-500" />
                            Archive
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <p className="text-gray-500">{form.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {form.status === 'draft' && (
            <button
              onClick={() => updateFormStatus('active')}
              disabled={isUpdatingStatus}
              className="btn btn-primary text-sm"
            >
              {isUpdatingStatus ? (
                <Spinner size={18} className="animate-spin" />
              ) : (
                <Play size={18} weight="fill" />
              )}
              <span className="hidden sm:inline">Publish</span>
            </button>
          )}
          {form.formType === 'builder' && (
            <Link
              href={`/dashboard/forms/${formId}/edit`}
              className="btn btn-secondary text-sm"
            >
              <PencilSimple size={18} />
              <span className="hidden sm:inline">Edit Fields</span>
              <span className="sm:hidden">Edit</span>
            </Link>
          )}
          <Link
            href={formPageUrl}
            target="_blank"
            className="btn btn-secondary text-sm"
          >
            <Eye size={18} />
            <span className="hidden sm:inline">View Form</span>
            <span className="sm:hidden">View</span>
            <ArrowSquareOut size={14} className="hidden sm:block" />
          </Link>
          {/* More menu with delete */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="btn btn-secondary text-sm px-2"
            >
              <DotsThree size={20} weight="bold" />
            </button>
            <AnimatePresence>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20"
                  >
                    <button
                      onClick={handleDuplicate}
                      disabled={isDuplicating}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isDuplicating ? (
                        <Spinner size={16} className="animate-spin" />
                      ) : (
                        <Copy size={16} />
                      )}
                      Duplicate Form
                    </button>
                    <button
                      onClick={() => { setShowMoreMenu(false); setShowDeleteModal(true); }}
                      disabled={isDeleting}
                      className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Spinner size={16} className="animate-spin" />
                      ) : (
                        <Trash size={16} />
                      )}
                      Delete Form
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Stats */}
      {(() => {
        const hasPaymentField = form.fields.some((f: { type: string }) => f.type === 'payment');
        const totalRevenue = submissions.reduce((sum, sub) => {
          return sum + (sub.metadata?.payment?.amount || 0);
        }, 0);
        const paidCount = submissions.filter(s => s.metadata?.payment?.status === 'paid').length;
        const currency = submissions.find(s => s.metadata?.payment?.currency)?.metadata?.payment?.currency || 'usd';
        const symbols: Record<string, string> = { usd: '$', eur: '€', gbp: '£', cad: 'C$', aud: 'A$' };
        const sym = symbols[currency] || '$';

        return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', hasPaymentField ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">Total Submissions</div>
          <div className="text-2xl font-semibold text-gray-900">
            {submissions.length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">Total Views</div>
          <div className="text-2xl font-semibold text-gray-900">
            {form.views.toLocaleString()}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">Conversion Rate</div>
          <div className="text-2xl font-semibold text-gray-900">
            {form.views > 0 ? ((submissions.length / form.views) * 100).toFixed(1) : 0}%
          </div>
        </div>
        {hasPaymentField && (
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">Revenue</div>
          <div className="text-2xl font-semibold text-gray-900">
            {sym}{totalRevenue.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{paidCount} paid</div>
        </div>
        )}
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">Form Status</div>
          <div className="text-lg font-semibold text-gray-900">
            {form.status === 'active' ? 'Live' :
             form.status === 'paused' ? 'Paused' :
             form.status === 'archived' ? 'Archived' :
             'Draft'}
          </div>
        </div>
      </div>
        );
      })()}

      {/* Quick Share Section - Visible for active and paused forms */}
      {(form.status === 'active' || form.status === 'paused') && (
        <div className="card p-6 border-safety-orange/30 bg-safety-orange/5">
          <div className="flex items-center gap-2 mb-4">
            <LinkIcon size={20} className="text-safety-orange" />
            <h3 className="font-medium text-gray-800">
              {form.formType === 'endpoint' ? 'API Endpoint' : 'Share Your Form'}
            </h3>
          </div>
          <div className={cn(
            "grid gap-4",
            form.formType === 'endpoint' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
          )}>
            {/* Only show public URL for builder forms */}
            {form.formType !== 'endpoint' && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                  Public Form URL
                </label>
                <div className="flex gap-2">
                  <code className="input font-mono text-sm text-safety-orange flex-1 truncate">
                    {formPageUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(formPageUrl, 'formUrl')}
                    className="btn btn-secondary"
                  >
                    {copied === 'formUrl' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                  </button>
                  <Link href={formPageUrl} target="_blank" className="btn btn-secondary">
                    <ArrowSquareOut size={18} />
                  </Link>
                  <button
                    onClick={() => setShowQrCode(!showQrCode)}
                    className={cn('btn btn-secondary', showQrCode && 'ring-2 ring-safety-orange')}
                  >
                    <QrCode size={18} />
                  </button>
                </div>
                {showQrCode && (
                  <div className="mt-4 flex flex-col items-center gap-3">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm inline-block relative">
                      <QRCode value={formPageUrl} size={180} level="H" />
                      {/* Forma branding in center of QR (free plan only) */}
                      {showQrBranding && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-white rounded-lg p-1.5 shadow-sm">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-900">
                              <Stack size={12} weight="fill" />
                              Forma
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const svg = document.querySelector('.qr-download-target svg');
                        if (!svg) return;
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const canvas = document.createElement('canvas');
                        canvas.width = 512;
                        canvas.height = 512;
                        const ctx = canvas.getContext('2d');
                        const img = new Image();
                        img.onload = () => {
                          ctx?.fillRect(0, 0, 512, 512);
                          if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 512); }
                          ctx?.drawImage(img, 32, 32, 448, 448);
                          const a = document.createElement('a');
                          a.download = `${form?.name || 'form'}-qr-code.png`;
                          a.href = canvas.toDataURL('image/png');
                          a.click();
                        };
                        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                      }}
                      className="text-xs text-safety-orange hover:text-accent-200 font-medium"
                    >
                      Download PNG
                    </button>
                    <div className="qr-download-target hidden">
                      <QRCode value={formPageUrl} size={448} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                API Endpoint (POST)
              </label>
              <div className="flex gap-2">
                <code className="input font-mono text-sm text-safety-orange flex-1 truncate">
                  {apiEndpoint}
                </code>
                <button
                  onClick={() => copyToClipboard(apiEndpoint, 'apiUrl')}
                  className="btn btn-secondary"
                >
                  {copied === 'apiUrl' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                </button>
              </div>
              {form.formType === 'endpoint' && (
                <p className="text-xs text-gray-500 mt-2">
                  POST any JSON data to this endpoint. No predefined fields required.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-4 sm:gap-6 min-w-max">
          {[
            { id: 'submissions', label: 'Submissions', icon: EnvelopeSimple, count: submissions.length },
            ...(form.fields?.some((f: { type: string }) => f.type === 'booking')
              ? [{ id: 'bookings', label: 'Bookings', icon: CalendarCheck, count: undefined }]
              : []),
            { id: 'analytics', label: 'Analytics', icon: ChartLineUp },
            { id: 'settings', label: 'Settings', icon: Gear },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 py-3 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base',
                activeTab === tab.id
                  ? 'border-safety-orange text-safety-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon size={18} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              {tab.count !== undefined && (
                <span className="text-xs bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="card p-12 text-center">
              <EnvelopeSimple size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                No submissions yet
              </h3>
              <p className="text-gray-500 mb-4">
                {form.formType === 'endpoint'
                  ? 'POST data to your API endpoint to start collecting submissions'
                  : 'Share your form to start collecting responses'}
              </p>
              <button
                onClick={() => copyToClipboard(
                  form.formType === 'endpoint' ? apiEndpoint : formPageUrl,
                  'emptyState'
                )}
                className="btn btn-primary"
              >
                {copied === 'emptyState' ? <Check size={18} /> : <Copy size={18} />}
                {form.formType === 'endpoint' ? 'Copy API Endpoint' : 'Copy Form Link'}
              </button>
            </div>
          ) : (
            <>
              {/* Actions Bar */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <MagnifyingGlass
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Search submissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input input-with-icon"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  {searchQuery && (
                    <span className="text-sm text-gray-500">
                      {filteredSubmissions.length} of {submissions.length}
                    </span>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="btn btn-secondary"
                    >
                      <Export size={18} />
                      Export
                      <CaretDown size={14} className={cn('transition-transform', showExportMenu && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {showExportMenu && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20"
                          >
                            <button
                              onClick={exportToCSV}
                              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <span className="w-8 h-8 rounded bg-safety-orange/10 flex items-center justify-center text-safety-orange text-xs font-bold">CSV</span>
                              Export as CSV
                            </button>
                            <button
                              onClick={exportToJSON}
                              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                            >
                              <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold">JSON</span>
                              Export as JSON
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Submissions - Mobile Cards / Desktop Table */}
              {(() => {
                // Create a map of field IDs to labels
                const fieldLabels = new Map<string, string>();
                form.fields.forEach(field => {
                  fieldLabels.set(field.id, field.label);
                });

                // Helper to get label for a field ID
                const getFieldLabel = (fieldId: string) => fieldLabels.get(fieldId) || fieldId;

                // Compute dynamic columns from all submission data
                const columnSet = new Set<string>();
                filteredSubmissions.forEach(sub => {
                  Object.keys(sub.data).forEach(key => columnSet.add(key));
                });
                const dynamicColumns = Array.from(columnSet).slice(0, 5); // Limit to 5 columns for display

                const isFileData = (value: unknown): boolean => {
                  if (typeof value !== 'string') return false;
                  try {
                    const parsed = JSON.parse(value);
                    return parsed && typeof parsed === 'object' && 'name' in parsed && ('data' in parsed || 'url' in parsed);
                  } catch {
                    return false;
                  }
                };

                const isBookingData = (value: unknown): boolean => {
                  if (typeof value !== 'string') return false;
                  try {
                    const parsed = JSON.parse(value);
                    return parsed && typeof parsed === 'object' && 'date' in parsed && 'slots' in parsed;
                  } catch { return false; }
                };

                const formatBookingValue = (value: string): string => {
                  try {
                    const parsed = JSON.parse(value);
                    const date = new Date(parsed.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    const slots = (parsed.slots as Array<{ start: string; end: string }>).map(s => {
                      const fmt = (t: string) => { const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${ap}`; };
                      return `${fmt(s.start)} - ${fmt(s.end)}`;
                    });
                    return `${date} · ${slots.join(', ')}`;
                  } catch { return String(value); }
                };

                const formatCellValue = (value: unknown): string => {
                  if (value === undefined || value === null || value === '') return '-';
                  if (Array.isArray(value)) return value.join(', ');
                  if (typeof value === 'string' && isFileData(value)) {
                    const fileData = JSON.parse(value);
                    return fileData.name;
                  }
                  if (typeof value === 'string' && isBookingData(value)) {
                    return formatBookingValue(value);
                  }
                  if (typeof value === 'object') return JSON.stringify(value);
                  return String(value);
                };

                const renderFileDownload = (value: string) => {
                  const fileData = JSON.parse(value);
                  const href = fileData.url || fileData.data;
                  return (
                    <a
                      href={href}
                      download={fileData.name}
                      target={fileData.url ? '_blank' : undefined}
                      rel={fileData.url ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:border-safety-orange/30 hover:bg-safety-orange/5 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <span className="text-gray-900 truncate max-w-[200px]">{fileData.name}</span>
                      <span className="text-xs text-gray-400">{fileData.size >= 1024 * 1024 ? `${(fileData.size / (1024 * 1024)).toFixed(1)} MB` : `${(fileData.size / 1024).toFixed(0)} KB`}</span>
                    </a>
                  );
                };

                return (
                  <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {filteredSubmissions.map((submission, index) => {
                        const isExpanded = expandedSubmission === submission.id;
                        const firstColumn = dynamicColumns[0];
                        const firstValue = firstColumn ? formatCellValue(submission.data[firstColumn]) : '-';

                        return (
                          <motion.div
                            key={submission.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.03 }}
                            className={cn(
                              "card p-4 cursor-pointer",
                              isExpanded && "ring-2 ring-safety-orange/20"
                            )}
                            onClick={() => setExpandedSubmission(isExpanded ? null : submission.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={selectedSubmissions.includes(submission.id)}
                                  onChange={() => toggleSubmission(submission.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded border-gray-300 mt-1"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 truncate">
                                    {firstValue}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {getTimeAgo(submission.createdAt)}
                                  </div>
                                </div>
                              </div>
                              <CaretDown
                                size={18}
                                className={cn(
                                  'text-gray-400 transition-transform flex-shrink-0',
                                  isExpanded && 'rotate-180'
                                )}
                              />
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="pt-4 mt-4 border-t border-gray-100 space-y-3">
                                    {Object.entries(submission.data).map(([key, value]) => {
                                      const mobileFieldDef = form.fields.find((f: { id: string; type: string }) => f.id === key);
                                      if (mobileFieldDef?.type === 'payment' && submission.metadata?.payment) {
                                        const p = submission.metadata.payment;
                                        const symbols: Record<string, string> = { usd: '$', eur: '€', gbp: '£', cad: 'C$', aud: 'A$' };
                                        const sym = symbols[p.currency || 'usd'] || '$';
                                        return (
                                          <div key={key}>
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{getFieldLabel(key)}</div>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                              {sym}{Number(p.amount).toFixed(2)} Paid
                                            </span>
                                          </div>
                                        );
                                      }
                                      return (
                                      <div key={key}>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                          {getFieldLabel(key)}
                                        </div>
                                        <div className="text-gray-700 text-sm break-words">
                                          {typeof value === 'string' && isFileData(value)
                                            ? renderFileDownload(value)
                                            : formatCellValue(value)}
                                        </div>
                                      </div>
                                      );
                                    })}
                                    <div className="pt-2 border-t border-gray-100">
                                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                        Submitted At
                                      </div>
                                      <div className="text-gray-700 text-sm">
                                        {new Date(submission.createdAt).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block card overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-sm text-gray-500 bg-gray-50">
                            <th className="p-4 w-12">
                              <input
                                type="checkbox"
                                checked={selectedSubmissions.length === filteredSubmissions.length && filteredSubmissions.length > 0}
                                onChange={toggleSelectAll}
                                className="rounded border-gray-300"
                              />
                            </th>
                            {dynamicColumns.map(col => (
                              <th key={col} className="p-4 font-medium max-w-[180px]">
                                <span className="truncate block">{getFieldLabel(col)}</span>
                              </th>
                            ))}
                            <th className="p-4 font-medium w-32">Submitted</th>
                            <th className="p-4 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredSubmissions.map((submission, index) => {
                            const isExpanded = expandedSubmission === submission.id;
                            const totalColumns = dynamicColumns.length + 3;

                            return (
                              <React.Fragment key={submission.id}>
                                <motion.tr
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: index * 0.03 }}
                                  className={cn(
                                    "hover:bg-gray-50 transition-colors cursor-pointer",
                                    isExpanded && "bg-gray-50"
                                  )}
                                  onClick={() =>
                                    setExpandedSubmission(isExpanded ? null : submission.id)
                                  }
                                >
                                  <td className="p-4 w-12" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={selectedSubmissions.includes(submission.id)}
                                      onChange={() => toggleSubmission(submission.id)}
                                      className="rounded border-gray-300"
                                    />
                                  </td>
                                  {dynamicColumns.map(col => {
                                    const colField = form.fields.find((f: { id: string; type: string }) => f.id === col);
                                    if (colField?.type === 'payment' && submission.metadata?.payment) {
                                      const p = submission.metadata.payment;
                                      const symbols: Record<string, string> = { usd: '$', eur: '€', gbp: '£', cad: 'C$', aud: 'A$' };
                                      const sym = symbols[p.currency || 'usd'] || '$';
                                      return (
                                        <td key={col} className="p-4 max-w-[180px]">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                            {sym}{Number(p.amount).toFixed(2)} Paid
                                          </span>
                                        </td>
                                      );
                                    }
                                    return (
                                    <td key={col} className="p-4 max-w-[180px]">
                                      <span className="text-gray-700 truncate block">
                                        {formatCellValue(submission.data[col])}
                                      </span>
                                    </td>
                                    );
                                  })}
                                  <td className="p-4 w-32 text-sm text-gray-500">
                                    {getTimeAgo(submission.createdAt)}
                                  </td>
                                  <td className="p-4 w-12">
                                    <CaretDown
                                      size={16}
                                      className={cn(
                                        'text-gray-500 transition-transform',
                                        isExpanded && 'rotate-180'
                                      )}
                                    />
                                  </td>
                                </motion.tr>

                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.tr
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                    >
                                      <td colSpan={totalColumns} className="p-0 bg-gray-50 border-t border-gray-100">
                                        <motion.div
                                          initial={{ height: 0 }}
                                          animate={{ height: 'auto' }}
                                          exit={{ height: 0 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                              <h4 className="font-medium text-gray-800">
                                                All Submission Data
                                              </h4>
                                              {Object.entries(submission.data).map(([key, value]) => {
                                                // For payment fields, show payment info from metadata instead of empty value
                                                const fieldDef = form.fields.find((f: { id: string; type: string }) => f.id === key);
                                                if (fieldDef?.type === 'payment' && submission.metadata?.payment) {
                                                  const p = submission.metadata.payment;
                                                  const symbols: Record<string, string> = { usd: '$', eur: '€', gbp: '£', cad: 'C$', aud: 'A$' };
                                                  const sym = symbols[p.currency || 'usd'] || '$';
                                                  return (
                                                    <div key={key}>
                                                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                                        {getFieldLabel(key)}
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                          {sym}{Number(p.amount).toFixed(2)} {(p.currency || 'usd').toUpperCase()} — Paid
                                                        </span>
                                                      </div>
                                                    </div>
                                                  );
                                                }
                                                return (
                                                <div key={key}>
                                                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                                    {getFieldLabel(key)}
                                                  </div>
                                                  <div className="text-gray-700">
                                                    {typeof value === 'string' && isFileData(value)
                                                      ? renderFileDownload(value)
                                                      : typeof value === 'string' && isBookingData(value)
                                                      ? (() => {
                                                          try {
                                                            const parsed = JSON.parse(value);
                                                            const date = new Date(parsed.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                                                            return (
                                                              <div className="space-y-2">
                                                                <div className="font-medium text-gray-900">{date}</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                  {(parsed.slots as Array<{ start: string; end: string }>).map((s: { start: string; end: string }, i: number) => {
                                                                    const fmt = (t: string) => { const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${ap}`; };
                                                                    return (
                                                                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-safety-orange/10 text-safety-orange border border-safety-orange/20">
                                                                        <Clock size={14} />
                                                                        {fmt(s.start)} – {fmt(s.end)}
                                                                      </span>
                                                                    );
                                                                  })}
                                                                </div>
                                                              </div>
                                                            );
                                                          } catch { return formatCellValue(value); }
                                                        })()
                                                      : formatCellValue(value)}
                                                  </div>
                                                </div>
                                                );
                                              })}
                                            </div>
                                            <div className="space-y-4">
                                              <h4 className="font-medium text-gray-800">Metadata</h4>
                                              <div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                                  Submitted At
                                                </div>
                                                <div className="text-gray-700">
                                                  {new Date(submission.createdAt).toLocaleString()}
                                                </div>
                                              </div>
                                              {submission.metadata?.ip && (
                                                <div>
                                                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                                    IP Address
                                                  </div>
                                                  <div className="text-gray-700">{submission.metadata.ip}</div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </motion.div>
                                      </td>
                                    </motion.tr>
                                  )}
                                </AnimatePresence>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* Floating action bar for selected submissions */}
      <AnimatePresence>
        {selectedSubmissions.length > 0 && activeTab === 'submissions' && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4"
          >
            <span className="text-sm font-medium">
              {selectedSubmissions.length} of {filteredSubmissions.length} selected
            </span>
            <div className="w-px h-5 bg-gray-700" />
            <button
              onClick={() => {
                setSelectedSubmissions([]);
              }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Export selected as CSV
                const selected = submissions.filter(s => selectedSubmissions.includes(s.id));
                const allKeys = new Set<string>();
                selected.forEach(s => Object.keys(s.data).forEach(k => allKeys.add(k)));
                const keys = Array.from(allKeys);
                const getLabel = (key: string) => {
                  const field = form.fields?.find((f: { id: string }) => f.id === key);
                  return field ? (field as { label: string }).label : key;
                };
                const header = keys.map(k => getLabel(k)).join(',');
                const rows = selected.map(s =>
                  keys.map(k => {
                    const v = s.data[k];
                    const str = typeof v === 'object' ? JSON.stringify(v) : String(v || '');
                    return `"${str.replace(/"/g, '""')}"`;
                  }).join(',')
                );
                const csv = [header, ...rows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${form?.name || 'submissions'}-export.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Export size={16} />
              Export
            </button>
            <button
              onClick={() => setShowDeleteSubsConfirm(true)}
              disabled={isDeletingSubs}
              className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
            >
              <Trash size={16} />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete submissions confirmation */}
      <AnimatePresence>
        {showDeleteSubsConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowDeleteSubsConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash size={28} className="text-red-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Delete {selectedSubmissions.length} submission{selectedSubmissions.length > 1 ? 's' : ''}?</h2>
                  <p className="text-gray-500 text-sm">This action cannot be undone.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteSubsConfirm(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsDeletingSubs(true);
                      try {
                        const res = await fetch(`/api/forms/${formId}/submissions`, {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ submissionIds: selectedSubmissions }),
                        });
                        if (res.ok) {
                          setSubmissions(prev => prev.filter(s => !selectedSubmissions.includes(s.id)));
                          setSelectedSubmissions([]);
                          setShowDeleteSubsConfirm(false);
                        }
                      } catch {
                      } finally {
                        setIsDeletingSubs(false);
                      }
                    }}
                    disabled={isDeletingSubs}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDeletingSubs ? <Spinner size={18} className="animate-spin" /> : <Trash size={18} />}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {activeTab === 'bookings' && (
        <BookingsView
          submissions={submissions}
          bookingFieldIds={(form.fields || []).filter((f: { type: string }) => f.type === 'booking').map((f: { id: string }) => f.id)}
          fields={(form.fields || []).map((f: { id: string; type: string; label: string }) => ({ id: f.id, type: f.type, label: f.label }))}
        />
      )}

      {activeTab === 'analytics' && (
        <FormAnalytics formId={formId} />
      )}

      {activeTab === 'settings' && (
        <FormSettingsPanel form={form} submissions={submissions} onFormUpdate={fetchFormData} />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowDeleteModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash size={28} className="text-red-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Delete this form?</h2>
                  <p className="text-gray-500 text-sm">
                    This will permanently delete <strong>{form?.name}</strong> and all its submissions. This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Spinner size={18} className="animate-spin" />
                    ) : (
                      <Trash size={18} />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Publish Success Modal */}
      <AnimatePresence>
        {showPublishModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowPublishModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>

                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-3xl">🎉</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Your form is live!</h2>
                  <p className="text-gray-500 text-sm">Share the link below to start collecting responses.</p>
                </div>

                <div className="mb-6">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Form link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/f/${formId}`}
                      className="input flex-1 text-sm bg-gray-50"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/f/${formId}`);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                      className={cn(
                        'btn text-sm whitespace-nowrap',
                        linkCopied ? 'btn-primary' : 'btn-secondary'
                      )}
                    >
                      {linkCopied ? (
                        <><Check size={16} /> Copied!</>
                      ) : (
                        <><Copy size={16} /> Copy</>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 block">Share via</label>
                  <div className="flex gap-3">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Check out this form: ${typeof window !== 'undefined' ? window.location.origin : ''}/f/${formId}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 border border-gray-200"
                    >
                      <WhatsappLogo size={20} weight="fill" className="text-[#25D366]" />
                      WhatsApp
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/f/${formId}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 border border-gray-200"
                    >
                      <LinkedinLogo size={20} weight="fill" className="text-[#0A66C2]" />
                      LinkedIn
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(form?.name || 'Form')}&body=${encodeURIComponent(`Fill out this form: ${typeof window !== 'undefined' ? window.location.origin : ''}/f/${formId}`)}`}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 border border-gray-200"
                    >
                      <EnvelopeSimple size={20} className="text-gray-600" />
                      Email
                    </a>
                  </div>
                </div>

                {/* QR Code */}
                <div className="mb-6 flex flex-col items-center">
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm relative">
                    <QRCode value={`${typeof window !== 'undefined' ? window.location.origin : ''}/f/${formId}`} size={140} level="H" />
                    {showQrBranding && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-white rounded-lg p-1 shadow-sm">
                          <div className="flex items-center gap-1 text-[9px] font-bold text-gray-900">
                            <Stack size={10} weight="fill" />
                            Forma
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Scan to open form</p>
                </div>

                <a
                  href={`/f/${formId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center text-sm text-safety-orange hover:text-accent-200 font-medium transition-colors"
                >
                  Open form in new tab →
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
