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
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import FormAnalytics from '@/components/dashboard/FormAnalytics';
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

type Tab = 'submissions' | 'analytics' | 'settings';

export default function FormDetailPage() {
  const params = useParams();
  const formId = params.id as string;

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

  const updateFormStatus = async (newStatus: string) => {
    if (!form) return;
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
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
      setShowStatusMenu(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this form? This will also delete all submissions. This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        window.location.href = '/dashboard/forms';
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete form');
      }
    } catch (err) {
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
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
        <div className="flex items-center gap-2 flex-wrap">
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
                      onClick={handleDelete}
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
                </div>
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
            { id: 'analytics', label: 'Analytics', icon: ChartLineUp },
            { id: 'settings', label: 'Embed', icon: Code },
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
              <span className="sm:hidden">{tab.id === 'settings' ? 'Embed' : tab.label.split(' ')[0]}</span>
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
                    return parsed && typeof parsed === 'object' && 'name' in parsed && 'data' in parsed;
                  } catch {
                    return false;
                  }
                };

                const formatCellValue = (value: unknown): string => {
                  if (value === undefined || value === null || value === '') return '-';
                  if (Array.isArray(value)) return value.join(', ');
                  if (typeof value === 'string' && isFileData(value)) {
                    const fileData = JSON.parse(value);
                    return `📎 ${fileData.name}`;
                  }
                  if (typeof value === 'object') return JSON.stringify(value);
                  return String(value);
                };

                const renderFileDownload = (value: string) => {
                  const fileData = JSON.parse(value);
                  return (
                    <a
                      href={fileData.data}
                      download={fileData.name}
                      className="inline-flex items-center gap-2 text-safety-orange hover:underline"
                    >
                      <span>📎</span>
                      <span>{fileData.name}</span>
                      <span className="text-xs text-gray-500">({(fileData.size / 1024).toFixed(1)} KB)</span>
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

      {activeTab === 'analytics' && (
        <FormAnalytics formId={formId} />
      )}

      {activeTab === 'settings' && (
        <FormSettingsPanel form={form} submissions={submissions} onFormUpdate={fetchFormData} />
      )}
    </div>
  );
}
