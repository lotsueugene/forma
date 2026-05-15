'use client';

import { useEffect, useState } from 'react';
import { Spinner, FloppyDisk, ArrowCounterClockwise, EnvelopeSimple } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Template {
  slug: string;
  description: string;
  subject: string;
  body: string;
  defaults: { subject: string; body: string };
  updatedAt: string | null;
  isCustomised: boolean;
}

// All editable templates are listed here. Currently just `welcome`; adding a
// new one is: define defaults in src/lib/email.ts, add it to DEFAULTS in
// /api/admin/emails/[slug]/route.ts, and add an entry below.
const TEMPLATES = [
  { slug: 'welcome', label: 'Welcome email' },
];

export default function AdminEmailsPage() {
  const [activeSlug, setActiveSlug] = useState(TEMPLATES[0].slug);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/emails/${activeSlug}`)
      .then((r) => r.json())
      .then((data: Template) => {
        if (cancelled) return;
        setTemplate(data);
        setSubject(data.subject);
        setBody(data.body);
      })
      .catch(() => {
        if (!cancelled) setToast({ type: 'error', message: 'Failed to load template' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSlug]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleSave = async () => {
    if (!subject.trim() || !body.trim()) {
      setToast({ type: 'error', message: 'Subject and body cannot be empty' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/emails/${activeSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: 'error', message: data.error || 'Failed to save' });
      } else {
        setTemplate((t) => (t ? { ...t, ...data } : t));
        setToast({ type: 'success', message: 'Saved. New signups will use this template.' });
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/emails/${activeSlug}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setToast({ type: 'error', message: data.error || 'Failed to reset' });
      } else {
        // Re-fetch to repopulate with defaults
        const fresh = await fetch(`/api/admin/emails/${activeSlug}`).then((r) => r.json());
        setTemplate(fresh);
        setSubject(fresh.subject);
        setBody(fresh.body);
        setToast({ type: 'success', message: 'Reverted to default template.' });
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to reset' });
    } finally {
      setSaving(false);
      setConfirmReset(false);
    }
  };

  const isDirty =
    template && (subject !== template.subject || body !== template.body);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Email Templates</h1>
        <p className="text-gray-500 text-sm">
          Edit the copy of system-sent emails. Changes take effect on the next send — already-queued emails are unaffected.
        </p>
      </div>

      {TEMPLATES.length > 1 && (
        <div className="flex gap-2 border-b border-gray-200">
          {TEMPLATES.map((t) => (
            <button
              key={t.slug}
              onClick={() => setActiveSlug(t.slug)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeSlug === t.slug
                  ? 'border-safety-orange text-safety-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center">
          <Spinner size={24} className="animate-spin text-gray-400 mx-auto" />
        </div>
      ) : template ? (
        <div className="space-y-5">
          <div className="card p-4 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <EnvelopeSimple size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-amber-900">{template.description.split('.')[0]}.</div>
                <div className="text-amber-800/80 mt-0.5">{template.description.split('.').slice(1).join('.').trim()}</div>
                {template.updatedAt && (
                  <div className="text-xs text-amber-700 mt-2">
                    Last edited {new Date(template.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Welcome to Forma"
                maxLength={200}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Body (HTML)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={16}
                maxLength={20000}
                className="input w-full font-mono text-sm leading-relaxed"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Plain HTML allowed (paragraphs, lists, links). Forma wraps this in the standard layout (logo header, CTA, footer) when sent. The dashboard CTA button and footer are added automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={saving || !template.isCustomised}
              className="btn btn-ghost text-sm"
              title={!template.isCustomised ? 'Already using the built-in default' : ''}
            >
              <ArrowCounterClockwise size={14} />
              Reset to default
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="btn btn-primary text-sm"
            >
              {saving ? (
                <>
                  <Spinner size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FloppyDisk size={14} />
                  Save changes
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center text-gray-500">Template not found</div>
      )}

      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium z-50 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Reset to default?"
        message="This will discard your customisations and revert the template to the version shipped in code. Cannot be undone via this UI."
        confirmText="Reset"
        variant="warning"
      />
    </div>
  );
}
