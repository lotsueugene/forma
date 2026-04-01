'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Spinner,
  Trash,
  PencilSimple,
  Check,
  LinkSimple,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface FooterLink {
  id: string;
  section: string;
  label: string;
  href: string;
  external: boolean;
  sortOrder: number;
  active: boolean;
}

const SECTIONS = ['product', 'developers', 'company', 'legal'];

const sectionLabels: Record<string, string> = {
  product: 'Product',
  developers: 'Developers',
  company: 'Company',
  legal: 'Legal',
};

export default function AdminFooterPage() {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyFormData = {
    section: 'product',
    label: '',
    href: '',
    external: false,
    sortOrder: 0,
    active: true,
  };

  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/footer');
      const data = await res.json();
      setLinks(data.links || []);
    } catch (error) {
      console.error('Failed to load footer links:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingLink(null);
    setFormData(emptyFormData);
    setShowForm(true);
  };

  const openEditForm = (link: FooterLink) => {
    setEditingLink(link);
    setFormData({
      section: link.section,
      label: link.label,
      href: link.href,
      external: link.external,
      sortOrder: link.sortOrder,
      active: link.active,
    });
    setShowForm(true);
  };

  const saveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingLink
        ? `/api/admin/footer/${editingLink.id}`
        : '/api/admin/footer';
      const method = editingLink ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingLink(null);
        setFormData(emptyFormData);
        loadLinks();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save link');
      }
    } catch (error) {
      console.error('Failed to save link:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const res = await fetch(`/api/admin/footer/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setLinks(links.filter(l => l.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete link:', error);
    }
  };

  const toggleActive = async (link: FooterLink) => {
    try {
      const res = await fetch(`/api/admin/footer/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !link.active }),
      });

      if (res.ok) {
        setLinks(links.map(l =>
          l.id === link.id ? { ...l, active: !l.active } : l
        ));
      }
    } catch (error) {
      console.error('Failed to toggle link:', error);
    }
  };

  // Group links by section
  const linksBySection = SECTIONS.reduce((acc, section) => {
    acc[section] = links.filter(l => l.section === section);
    return acc;
  }, {} as Record<string, FooterLink[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Footer Links</h1>
          <p className="text-gray-600">Manage the links displayed in the site footer</p>
        </div>
        <button onClick={openCreateForm} className="btn btn-primary">
          <Plus size={16} />
          Add Link
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <form onSubmit={saveLink} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">
            {editingLink ? 'Edit Link' : 'Add Link'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Section</label>
              <select
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="input w-full"
              >
                {SECTIONS.map(s => (
                  <option key={s} value={s}>{sectionLabels[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Label</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="input w-full"
                placeholder="e.g., Features"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Sort Order</label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">URL / Path</label>
            <input
              type="text"
              value={formData.href}
              onChange={(e) => setFormData({ ...formData, href: e.target.value })}
              className="input w-full"
              placeholder="e.g., /docs or https://external.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use /path for internal links or full URL for external links
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.external}
                onChange={(e) => setFormData({ ...formData, external: e.target.checked })}
              />
              External link (opens in new tab)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              Active (visible in footer)
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Spinner size={16} className="animate-spin" /> : <Check size={16} />}
              {editingLink ? 'Update Link' : 'Add Link'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingLink(null);
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Links by Section */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size={24} className="animate-spin text-gray-400" />
        </div>
      ) : links.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <LinkSimple size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No footer links yet</h3>
          <p className="text-gray-500 mb-4">Add links to display in the site footer.</p>
          <button onClick={openCreateForm} className="btn btn-primary">
            <Plus size={16} />
            Add First Link
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SECTIONS.map((section) => (
            <div key={section} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{sectionLabels[section]}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {linksBySection[section].length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No links in this section
                  </div>
                ) : (
                  linksBySection[section].map((link) => (
                    <div
                      key={link.id}
                      className={cn(
                        'p-4 flex items-center justify-between',
                        !link.active && 'opacity-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <LinkSimple size={16} className="text-gray-400" />
                          {link.external && (
                            <ArrowSquareOut size={12} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{link.label}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {link.href}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive(link)}
                          className={cn(
                            'px-2 py-1 text-xs rounded',
                            link.active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {link.active ? 'Active' : 'Hidden'}
                        </button>
                        <button
                          onClick={() => openEditForm(link)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        >
                          <PencilSimple size={16} />
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Best Practices Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-900 mb-2">Best Practices</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Product:</strong> Features, Pricing, Templates, Integrations</li>
          <li><strong>Developers:</strong> Documentation, API Reference, SDKs, Webhooks, Changelog</li>
          <li><strong>Company:</strong> About, Blog, Careers, Contact, Press</li>
          <li><strong>Legal:</strong> Privacy Policy, Terms of Service, Security, Cookie Policy</li>
        </ul>
      </div>
    </div>
  );
}
