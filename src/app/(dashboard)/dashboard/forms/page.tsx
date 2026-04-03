'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  DotsThree,
  Files,
  Eye,
  EnvelopeSimple,
  Trash,
  PencilSimple,
  Spinner,
  Lightning,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/workspace-context';

interface Form {
  id: string;
  name: string;
  description: string | null;
  submissions: number;
  views: number;
  status: string;
  formType: string;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'most-submissions' | 'alphabetical';

export default function FormsPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quick create modal state
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState('');
  const [isQuickCreating, setIsQuickCreating] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchForms();
    }
  }, [currentWorkspace?.id]);

  const fetchForms = async () => {
    if (!currentWorkspace?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/forms?workspaceId=${currentWorkspace.id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load forms');
        return;
      }

      setForms(data.forms);
      setError('');
    } catch (err) {
      setError('Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCreate = async () => {
    if (!quickCreateName.trim() || !currentWorkspace?.id || isQuickCreating) return;

    setIsQuickCreating(true);
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickCreateName.trim(),
          formType: 'endpoint',
          workspaceId: currentWorkspace.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create form');
        return;
      }

      // Redirect to form detail page to show the endpoint
      router.push(`/dashboard/forms/${data.form.id}`);
    } catch (err) {
      setError('Failed to create form');
    } finally {
      setIsQuickCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/forms/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete form');
        return;
      }

      setForms(forms.filter((f) => f.id !== id));
    } catch (err) {
      alert('Failed to delete form');
    } finally {
      setDeletingId(null);
      setMenuOpenId(null);
    }
  };

  const filteredForms = forms
    .filter((form) => {
      const searchLower = search.toLowerCase().trim();
      const matchesSearch = searchLower === '' ||
        form.name.toLowerCase().includes(searchLower) ||
        (form.description && form.description.toLowerCase().includes(searchLower));
      const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'most-submissions':
          return b.submissions - a.submissions;
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size={32} className="text-safety-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Forms</h1>
          <p className="text-gray-500">{forms.length} forms total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuickCreate(true)}
            className="btn btn-secondary"
          >
            <Lightning size={18} weight="fill" />
            Quick Create
          </button>
          <Link href="/dashboard/forms/new" className="btn btn-primary">
            <Plus size={18} weight="bold" />
            Build Form
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative min-w-0 md:min-w-[240px] lg:min-w-[300px]">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search forms..."
            className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-safety-orange focus:ring-1 focus:ring-safety-orange"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-safety-orange min-w-[120px]"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-safety-orange min-w-[150px]"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="most-submissions">Most Submissions</option>
          <option value="alphabetical">Alphabetical</option>
        </select>

        {/* View Toggle */}
        <div className="flex h-10 rounded-lg border border-gray-300 overflow-hidden bg-white">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid view"
            className={cn(
              'px-3 flex items-center justify-center transition-colors',
              viewMode === 'grid'
                ? 'bg-safety-orange text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="8" height="8" rx="1" />
              <rect x="13" y="3" width="8" height="8" rx="1" />
              <rect x="3" y="13" width="8" height="8" rx="1" />
              <rect x="13" y="13" width="8" height="8" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            className={cn(
              'px-3 flex items-center justify-center transition-colors',
              viewMode === 'list'
                ? 'bg-safety-orange text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="4" width="18" height="4" rx="1" />
              <rect x="3" y="10" width="18" height="4" rx="1" />
              <rect x="3" y="16" width="18" height="4" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Forms Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map((form, index) => (
            <motion.div
              key={form.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card group hover:border-gray-300 transition-colors"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      {form.formType === 'endpoint' ? (
                        <Lightning size={20} className="text-gray-600" />
                      ) : (
                        <Files size={20} className="text-gray-600" />
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/dashboard/forms/${form.id}`}
                        className="font-medium text-gray-800 hover:text-safety-orange transition-colors"
                      >
                        {form.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className={cn(
                            'badge',
                            form.status === 'active' ? 'badge-success' : 'badge-warning'
                          )}
                        >
                          {form.status}
                        </div>
                        {form.formType === 'endpoint' && (
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                            API
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setMenuOpenId(menuOpenId === form.id ? null : form.id)
                      }
                      className="p-1.5 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100"
                    >
                      <DotsThree size={20} weight="bold" />
                    </button>
                    <AnimatePresence>
                      {menuOpenId === form.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 mt-1 w-40 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden z-20"
                          >
                            <Link
                              href={`/dashboard/forms/${form.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                            >
                              <Eye size={16} className="text-gray-500" />
                              View
                            </Link>
                            {form.formType === 'builder' && (
                              <Link
                                href={`/dashboard/forms/${form.id}/edit`}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                              >
                                <PencilSimple size={16} className="text-gray-500" />
                                Edit Fields
                              </Link>
                            )}
                            <button
                              onClick={() => handleDelete(form.id)}
                              disabled={deletingId === form.id}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingId === form.id ? (
                                <Spinner size={16} className="animate-spin" />
                              ) : (
                                <Trash size={16} />
                              )}
                              Delete
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {form.description || 'No description'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-md bg-gray-100">
                    <div className="text-sm font-medium text-gray-800">
                      {form.submissions.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Submissions</div>
                  </div>
                  <div className="p-2 rounded-md bg-gray-100">
                    <div className="text-sm font-medium text-gray-800">
                      {form.views.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Views</div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                Created: {getTimeAgo(form.createdAt)}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="p-4 font-medium">Form</th>
                <th className="p-4 font-medium hidden md:table-cell">Status</th>
                <th className="p-4 font-medium hidden lg:table-cell">Submissions</th>
                <th className="p-4 font-medium hidden lg:table-cell">Views</th>
                <th className="p-4 font-medium">Created</th>
                <th className="p-4 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredForms.map((form, index) => (
                <motion.tr
                  key={form.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                        {form.formType === 'endpoint' ? (
                          <Lightning size={18} className="text-gray-600" />
                        ) : (
                          <Files size={18} className="text-gray-600" />
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/forms/${form.id}`}
                          className="font-medium text-gray-800 hover:text-safety-orange"
                        >
                          {form.name}
                        </Link>
                        <div className="text-xs text-gray-500 max-w-[200px] truncate">
                          {form.description || 'No description'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'badge',
                          form.status === 'active' ? 'badge-success' : 'badge-warning'
                        )}
                      >
                        {form.status}
                      </div>
                      {form.formType === 'endpoint' && (
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                          API
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2 text-gray-700">
                      <EnvelopeSimple size={16} className="text-gray-500" />
                      {form.submissions.toLocaleString()}
                    </div>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Eye size={16} className="text-gray-500" />
                      {form.views.toLocaleString()}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-500">{getTimeAgo(form.createdAt)}</td>
                  <td className="p-4">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setMenuOpenId(menuOpenId === form.id ? null : form.id)
                        }
                        className="p-1.5 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100"
                      >
                        <DotsThree size={20} weight="bold" />
                      </button>
                      <AnimatePresence>
                        {menuOpenId === form.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 mt-1 w-40 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden z-20"
                            >
                              <Link
                                href={`/dashboard/forms/${form.id}`}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                              >
                                <Eye size={16} className="text-gray-500" />
                                View
                              </Link>
                              {form.formType === 'builder' && (
                                <Link
                                  href={`/dashboard/forms/${form.id}/edit`}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                                >
                                  <PencilSimple size={16} className="text-gray-500" />
                                  Edit Fields
                                </Link>
                              )}
                              <button
                                onClick={() => handleDelete(form.id)}
                                disabled={deletingId === form.id}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingId === form.id ? (
                                  <Spinner size={16} className="animate-spin" />
                                ) : (
                                  <Trash size={16} />
                                )}
                                Delete
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredForms.length === 0 && !isLoading && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Files size={32} className="text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No forms found</h3>
          <p className="text-gray-500 mb-6">
            {search
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first form'}
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setShowQuickCreate(true)}
              className="btn btn-secondary"
            >
              <Lightning size={18} weight="fill" />
              Quick Create
            </button>
            <Link href="/dashboard/forms/new" className="btn btn-primary">
              <Plus size={18} weight="bold" />
              Build Form
            </Link>
          </div>
        </div>
      )}

      {/* Quick Create Modal */}
      <AnimatePresence>
        {showQuickCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowQuickCreate(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md p-6 bg-gray-50 border border-gray-200 rounded-xl"
            >
              <button
                onClick={() => setShowQuickCreate(false)}
                className="absolute top-4 right-4 p-1 text-gray-500 hover:text-gray-900"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Lightning size={20} className="text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Quick Create Endpoint
                  </h2>
                  <p className="text-sm text-gray-500">
                    Get an API endpoint instantly
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Create a form endpoint with just a name. POST any JSON data to it -
                no predefined fields required. Perfect for API integrations.
              </p>

              <input
                type="text"
                value={quickCreateName}
                onChange={(e) => setQuickCreateName(e.target.value)}
                placeholder="e.g., Contact Form, Newsletter Signup"
                className="input w-full mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickCreate();
                }}
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowQuickCreate(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickCreate}
                  disabled={!quickCreateName.trim() || isQuickCreating}
                  className="btn btn-primary"
                >
                  {isQuickCreating ? (
                    <>
                      <Spinner size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Lightning size={18} weight="fill" />
                      Create & Get Endpoint
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
