'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  PencilSimple,
  Trash,
  Eye,
  EyeSlash,
  FloppyDisk,
  X,
  FileText,
  MagnifyingGlass,
  ArrowLeft,
} from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Checkbox } from '@/components/ui/Checkbox';

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle: string | null;
  metaDesc: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
    metaTitle: '',
    metaDesc: '',
    published: false,
  });
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'default';
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/admin/pages');
      const data = await res.json();
      setPages(data.pages || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingPage(null);
    setFormData({
      slug: '',
      title: '',
      content: '',
      metaTitle: '',
      metaDesc: '',
      published: false,
    });
  };

  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setIsCreating(false);
    setFormData({
      slug: page.slug,
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle || '',
      metaDesc: page.metaDesc || '',
      published: page.published,
    });
  };

  const handleCancel = () => {
    setEditingPage(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isCreating) {
        const res = await fetch('/api/admin/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          setErrorMessage(data.error || 'Failed to create page');
          return;
        }
      } else if (editingPage) {
        const res = await fetch(`/api/admin/pages/${editingPage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          setErrorMessage(data.error || 'Failed to update page');
          return;
        }
      }
      await fetchPages();
      handleCancel();
    } catch (error) {
      console.error('Error saving page:', error);
      setErrorMessage('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmAction({
      title: 'Delete Page',
      message: 'Are you sure you want to delete this page?',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
          await fetchPages();
        } catch (error) {
          console.error('Error deleting page:', error);
        }
      },
    });
  };

  const togglePublish = async (page: Page) => {
    try {
      await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !page.published }),
      });
      await fetchPages();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const filteredPages = pages.filter(
    (page) =>
      page.title.toLowerCase().includes(search.toLowerCase()) ||
      page.slug.toLowerCase().includes(search.toLowerCase())
  );

  // Editor view
  if (editingPage || isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {isCreating ? 'Create Page' : 'Edit Page'}
              </h1>
              <p className="text-sm text-gray-500">
                {isCreating ? 'Add a new static page' : `Editing: ${editingPage?.title}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="btn btn-secondary">
              <X size={18} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.title || !formData.slug}
              className="btn btn-primary"
            >
              <FloppyDisk size={18} />
              {saving ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6 space-y-4">
              <div className="form-field">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (isCreating) {
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
                      }));
                    }
                  }}
                  placeholder="Page title"
                  className="input"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="page-slug"
                    className="input"
                  />
                </div>
                <p className="form-helper">URL path for this page (e.g., privacy, terms, about)</p>
              </div>

              <div className="form-field">
                <label className="form-label">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Page content (supports Markdown)"
                  rows={20}
                  className="input font-mono text-sm"
                />
                <p className="form-helper">Supports Markdown formatting</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-6 space-y-4">
              <h3 className="font-medium text-gray-900">Publish</h3>
              <Checkbox
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                label="Publish this page"
              />
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="font-medium text-gray-900">SEO Settings</h3>
              <div className="form-field">
                <label className="form-label">Meta Title</label>
                <input
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder="SEO title (optional)"
                  className="input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Meta Description</label>
                <textarea
                  value={formData.metaDesc}
                  onChange={(e) => setFormData({ ...formData, metaDesc: e.target.value })}
                  placeholder="SEO description (optional)"
                  rows={3}
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">&#x2715;</button>
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
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Static Pages</h1>
          <p className="text-sm text-gray-500">Manage your static pages (Privacy, Terms, About, etc.)</p>
        </div>
        <button onClick={handleCreate} className="btn btn-primary">
          <Plus size={18} />
          Create Page
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pages..."
          className="input input-with-icon"
        />
      </div>

      {/* Pages List */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading pages...</div>
        ) : filteredPages.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4">
              {search ? 'No pages match your search' : 'No pages yet'}
            </p>
            {!search && (
              <button onClick={handleCreate} className="btn btn-primary">
                <Plus size={18} />
                Create your first page
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPages.map((page) => (
              <div key={page.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      page.published ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    <FileText
                      size={20}
                      className={page.published ? 'text-green-600' : 'text-gray-400'}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{page.title}</h3>
                    <p className="text-sm text-gray-500">/{page.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${page.published ? 'badge-accent' : 'badge-warning'}`}
                  >
                    {page.published ? 'Published' : 'Draft'}
                  </span>
                  <button
                    onClick={() => togglePublish(page)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title={page.published ? 'Unpublish' : 'Publish'}
                  >
                    {page.published ? (
                      <EyeSlash size={18} className="text-gray-500" />
                    ) : (
                      <Eye size={18} className="text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(page)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Edit"
                  >
                    <PencilSimple size={18} className="text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash size={18} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">&#x2715;</button>
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
    </div>
  );
}
