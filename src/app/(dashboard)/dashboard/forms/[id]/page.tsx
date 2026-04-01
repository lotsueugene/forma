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
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface Form {
  id: string;
  name: string;
  description: string | null;
  status: string;
  formType: string;
  fields: Array<{ id: string; label: string; type: string }>;
  submissions: number;
  views: number;
  createdAt: string;
}

interface Submission {
  id: string;
  data: Record<string, string | string[]>;
  metadata: { userAgent?: string; ip?: string; submittedAt?: string } | null;
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

    const header = columns.map(escapeCSV).join(',');
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
              <div
                className={cn(
                  'badge',
                  form.status === 'active' ? 'badge-success' : 'badge-warning'
                )}
              >
                {form.status}
              </div>
            </div>
            <p className="text-gray-500">{form.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {form.formType === 'builder' && (
            <Link
              href={`/dashboard/forms/${formId}/edit`}
              className="btn btn-secondary"
            >
              <PencilSimple size={18} />
              Edit Fields
            </Link>
          )}
          <Link
            href={formPageUrl}
            target="_blank"
            className="btn btn-secondary"
          >
            <Eye size={18} />
            View Form
            <ArrowSquareOut size={14} />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">Form Status</div>
          <div className={cn(
            'text-lg font-semibold',
            form.status === 'active' ? 'text-emerald-600' : 'text-yellow-600'
          )}>
            {form.status === 'active' ? 'Live' : 'Draft'}
          </div>
        </div>
      </div>

      {/* Quick Share Section - Always visible for active forms */}
      {form.status === 'active' && (
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
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { id: 'submissions', label: 'Submissions', icon: EnvelopeSimple, count: submissions.length },
            { id: 'analytics', label: 'Analytics', icon: ChartLineUp },
            { id: 'settings', label: 'Embed & Settings', icon: Code },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                'flex items-center gap-2 py-3 border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-safety-orange text-safety-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
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
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Submissions Table with Dynamic Columns */}
              {(() => {
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
                  <div className="card overflow-x-auto">
                    <table className="w-full min-w-[600px]">
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
                              <span className="truncate block">{col}</span>
                            </th>
                          ))}
                          <th className="p-4 font-medium w-32">Submitted</th>
                          <th className="p-4 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredSubmissions.map((submission, index) => {
                          const isExpanded = expandedSubmission === submission.id;
                          const totalColumns = dynamicColumns.length + 3; // checkbox + columns + submitted + arrow

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
                                {dynamicColumns.map(col => (
                                  <td key={col} className="p-4 max-w-[180px]">
                                    <span className="text-gray-700 truncate block">
                                      {formatCellValue(submission.data[col])}
                                    </span>
                                  </td>
                                ))}
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

                              {/* Expanded Details - shown inline below the row */}
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
                                            {Object.entries(submission.data).map(([key, value]) => (
                                              <div key={key}>
                                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                                  {key}
                                                </div>
                                                <div className="text-gray-700">
                                                  {typeof value === 'string' && isFileData(value)
                                                    ? renderFileDownload(value)
                                                    : formatCellValue(value)}
                                                </div>
                                              </div>
                                            ))}
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
                );
              })()}
            </>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="card p-8 text-center">
          <ChartLineUp size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Analytics Coming Soon
          </h3>
          <p className="text-gray-500">
            Detailed form analytics with conversion funnels and submission trends.
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Embed Options */}
          <div className="card p-6">
            <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
              <Code size={20} className="text-safety-orange" />
              Embed on Your Website
            </h3>
            <div className="space-y-6">
              {/* Method 1: Link */}
              <div>
                <label className="form-label">Option 1: Direct Link</label>
                <p className="text-sm text-gray-500 mb-2">
                  Share this link directly with users to fill out your form.
                </p>
                <div className="flex gap-2">
                  <code className="input font-mono text-sm text-safety-orange flex-1">
                    {formPageUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(formPageUrl, 'directLink')}
                    className="btn btn-secondary"
                  >
                    {copied === 'directLink' ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              {/* Method 2: API Endpoint */}
              <div>
                <label className="form-label">Option 2: API Endpoint</label>
                <p className="text-sm text-gray-500 mb-2">
                  POST form data directly to this endpoint from your own forms.
                </p>
                <div className="flex gap-2 mb-3">
                  <code className="input font-mono text-sm text-safety-orange flex-1">
                    POST {apiEndpoint}
                  </code>
                  <button
                    onClick={() => copyToClipboard(apiEndpoint, 'apiEndpoint')}
                    className="btn btn-secondary"
                  >
                    {copied === 'apiEndpoint' ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              {/* Method 3: HTML Form */}
              <div>
                <label className="form-label">Option 3: HTML Form</label>
                <p className="text-sm text-gray-500 mb-2">
                  Copy this HTML to embed a working form on your website.
                </p>
                <textarea
                  readOnly
                  value={`<form action="${apiEndpoint}" method="POST">
${form.fields.map(f => `  <label>${f.label}</label>
  <input type="${f.type === 'textarea' ? 'text' : f.type}" name="${f.id}" ${f.type === 'email' ? 'required' : ''}>
`).join('\n')}
  <button type="submit">Submit</button>
</form>`}
                  className="input font-mono text-xs h-48 w-full"
                />
                <button
                  onClick={() => copyToClipboard(`<form action="${apiEndpoint}" method="POST">
${form.fields.map(f => `  <label>${f.label}</label>
  <input type="${f.type === 'textarea' ? 'text' : f.type}" name="${f.id}">
`).join('\n')}
  <button type="submit">Submit</button>
</form>`, 'htmlEmbed')}
                  className="btn btn-secondary mt-2"
                >
                  {copied === 'htmlEmbed' ? <Check size={18} /> : <Copy size={18} />}
                  Copy HTML
                </button>
              </div>

              {/* Method 4: cURL Example */}
              <div>
                <label className="form-label">Option 4: cURL / API Example</label>
                <p className="text-sm text-gray-500 mb-2">
                  Send submissions programmatically using any HTTP client.
                </p>
                <textarea
                  readOnly
                  value={`curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
${form.fields.map(f => `    "${f.id}": "value"`).join(',\n')}
  }'`}
                  className="input font-mono text-xs h-32 w-full"
                />
                <button
                  onClick={() => copyToClipboard(`curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
${form.fields.map(f => `    "${f.id}": "value"`).join(',\n')}
  }'`, 'curlExample')}
                  className="btn btn-secondary mt-2"
                >
                  {copied === 'curlExample' ? <Check size={18} /> : <Copy size={18} />}
                  Copy cURL
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card p-6 border-red-500/20">
            <h3 className="font-medium text-red-600 mb-4">Danger Zone</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-800">Delete this form</div>
                <div className="text-sm text-gray-500">
                  This will also delete all {submissions.length} submissions
                </div>
              </div>
              <button className="btn bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30">
                <Trash size={18} />
                Delete Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
