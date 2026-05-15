'use client';

import { useEffect, useState } from 'react';
import {
  Spinner,
  FloppyDisk,
  ArrowCounterClockwise,
  EnvelopeSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import RichTextEditor from '@/components/ui/RichTextEditor';
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

// Add new editable templates here. Each one also needs a defaults entry in
// /api/admin/emails/[slug]/route.ts and a code-defined fallback in lib/email.ts.
const TEMPLATES = [
  { slug: 'welcome', label: 'Welcome' },
] as const;

export default function AdminEmailsPage() {
  const [activeSlug, setActiveSlug] = useState<typeof TEMPLATES[number]['slug']>(TEMPLATES[0].slug);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
  const activeLabel = TEMPLATES.find((t) => t.slug === activeSlug)?.label ?? 'Email';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Email Templates</h1>
          <p className="text-gray-600">Edit the copy of system-sent emails</p>
        </div>
      </div>

      {/* Tabs — same segmented control as Broadcasts/Replies, ready to host
          more templates without restyling. */}
      {TEMPLATES.length > 1 && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {TEMPLATES.map((t) => (
            <button
              key={t.slug}
              onClick={() => setActiveSlug(t.slug)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                activeSlug === t.slug
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <EnvelopeSimple size={16} className="inline mr-2" />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size={24} className="animate-spin text-gray-400" />
        </div>
      ) : template ? (
        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Edit {activeLabel} Email</h2>
            <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input w-full"
              placeholder="Your email subject line"
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Message (use {"{{name}}"} to personalize with user&apos;s name)
            </label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Hi {{name}}, welcome to Forma. Your account is ready..."
              rows={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              Just type your message. It will be automatically styled with the Forma email template.
            </p>
          </div>

          {template.updatedAt && (
            <div className="text-xs text-gray-500">
              Last edited {new Date(template.updatedAt).toLocaleString()}
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving || !isDirty}>
              {saving ? (
                <Spinner size={16} className="animate-spin" />
              ) : (
                <FloppyDisk size={16} />
              )}
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={saving || !template.isCustomised}
              className="btn btn-ghost"
              title={!template.isCustomised ? 'Already using the built-in default' : ''}
            >
              <ArrowCounterClockwise size={16} />
              Reset to Default
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          Template not found
        </div>
      )}

      {toast && (
        <div
          className={cn(
            'fixed bottom-4 right-4 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium z-50',
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          )}
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
