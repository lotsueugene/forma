'use client';

import { useState, useEffect } from 'react';
import {
  Gear,
  Palette,
  LinkSimple,
  Code,
  EyeSlash,
  Bell,
  Lock,
  Trash,
  Check,
  Spinner,
  Copy,
  UploadSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/workspace-context';
import UpgradeModal from './UpgradeModal';

interface FormField {
  id: string;
  type: string;
  label: string;
  defaultValue?: string;
}

interface FormSettings {
  branding?: {
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  thankYou?: {
    heading?: string;
    message?: string;
    redirectUrl?: string;
    showBranding?: boolean;
  };
  social?: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
  };
  saveAndResume?: boolean;
  customCss?: string;
  displayMode?: 'classic' | 'conversational';
}

interface Form {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  status: string;
  fields: FormField[];
  settings: FormSettings | null;
  views: number;
}

type SettingsTab = 'general' | 'branding' | 'link' | 'hidden' | 'embed' | 'danger';

const settingsTabs: { id: SettingsTab; label: string; icon: typeof Gear }[] = [
  { id: 'general', label: 'General', icon: Gear },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'link', label: 'Link & Customizations', icon: LinkSimple },
  { id: 'hidden', label: 'Hidden Fields', icon: EyeSlash },
  { id: 'embed', label: 'Embed & API', icon: Code },
  { id: 'danger', label: 'Danger Zone', icon: Trash },
];

export default function FormSettingsPanel({
  form,
  submissions,
  onFormUpdate,
}: {
  form: Form;
  submissions: { length: number };
  onFormUpdate: () => void;
}) {
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [planType, setPlanType] = useState('free');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingForm, setIsDeletingForm] = useState(false);

  const requirePro = (feature: string) => {
    if (planType === 'free') {
      setUpgradeFeature(feature);
      setShowUpgrade(true);
      return true;
    }
    return false;
  };

  // Form state
  const [name, setName] = useState(form.name);
  const [description, setDescription] = useState(form.description || '');
  const [slug, setSlug] = useState(form.slug || '');
  const [status, setStatus] = useState(form.status);
  const [settings, setSettings] = useState<FormSettings>(form.settings || {});
  const [originalState, setOriginalState] = useState(() => JSON.stringify({ name: form.name, description: form.description || '', slug: form.slug || '', status: form.status, settings: form.settings || {} }));

  const hasChanges = JSON.stringify({ name, description, slug, status, settings }) !== originalState;

  useEffect(() => {
    if (!currentWorkspace) return;
    fetch(`/api/workspaces/${currentWorkspace.id}/subscription`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.subscription?.plan) setPlanType(data.subscription.plan); })
      .catch(() => {});
  }, [currentWorkspace]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const formPageUrl = `${baseUrl}/f/${form.id}`;
  const apiEndpoint = `${baseUrl}/api/forms/${form.id}/submissions`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/forms/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          slug: slug || null,
          status,
          settings,
          fields: form.fields,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      setOriginalState(JSON.stringify({ name, description, slug, status, settings }));
      onFormUpdate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar tabs */}
      <div className="lg:w-48 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
        {settingsTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all',
              activeTab === tab.id
                ? 'bg-safety-orange/8 text-safety-orange font-medium'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* General */}
        {activeTab === 'general' && (
          <div className="card p-6 space-y-5">
            <h3 className="font-medium text-gray-900">General Settings</h3>
            <div className="space-y-4 max-w-lg">
              <div className="form-field">
                <label className="form-label">Form Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" />
              </div>
              <div className="form-field">
                <label className="form-label">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-20" placeholder="Optional description shown to respondents" />
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                  <option value="active">Active (accepting submissions)</option>
                  <option value="paused">Paused (visible but not accepting)</option>
                  <option value="draft">Draft (not visible)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Display Mode */}
              <div className="py-3 border-t border-gray-200">
                <label className="text-sm text-gray-900 block mb-2">Display Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, displayMode: 'conversational' })}
                    className={cn(
                      'flex-1 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all',
                      (settings.displayMode || 'conversational') === 'conversational'
                        ? 'border-safety-orange bg-safety-orange/10 text-safety-orange'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    Conversational
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, displayMode: 'classic' })}
                    className={cn(
                      'flex-1 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all',
                      settings.displayMode === 'classic'
                        ? 'border-safety-orange bg-safety-orange/10 text-safety-orange'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    Classic
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  {(settings.displayMode || 'conversational') === 'conversational'
                    ? 'One question at a time, like Typeform'
                    : 'All fields visible at once'}
                </p>
              </div>

              {/* Save & Resume */}
              <div className="flex items-center justify-between py-3 border-t border-gray-200">
                <div>
                  <label className="text-sm text-gray-900">Save & Resume {planType === 'free' && <span className="badge badge-accent text-[10px] ml-1">Pro</span>}</label>
                  <p className="text-xs text-gray-500">Allow respondents to save progress and finish later</p>
                </div>
                <button
                  onClick={() => {
                    if (requirePro('Save & Resume')) return;
                    setSettings({ ...settings, saveAndResume: !settings.saveAndResume });
                  }}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative',
                    settings.saveAndResume ? 'bg-safety-orange' : 'bg-gray-300'
                  )}
                >
                  <div className={cn('w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow', settings.saveAndResume ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
              </div>

              <button onClick={saveSettings} disabled={saving || !hasChanges} className={cn('btn btn-primary', !hasChanges && 'opacity-50')}>
                {saving ? <><Spinner size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Branding */}
        {activeTab === 'branding' && (
          <div className="card p-6 space-y-5">
            <h3 className="font-medium text-gray-900">Branding & Appearance</h3>
            <div className="space-y-4 max-w-lg">
              <div className="form-field">
                <label className="form-label">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.branding?.accentColor || '#ef6f2e'} onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, accentColor: e.target.value } })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                  <input type="text" value={settings.branding?.accentColor || '#ef6f2e'} onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, accentColor: e.target.value } })} className="input flex-1 text-sm" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Background Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.branding?.backgroundColor || '#ffffff'} onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, backgroundColor: e.target.value } })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                  <input type="text" value={settings.branding?.backgroundColor || '#ffffff'} onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, backgroundColor: e.target.value } })} className="input flex-1 text-sm" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Text Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.branding?.textColor || '#111827'} onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, textColor: e.target.value } })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                  <input type="text" value={settings.branding?.textColor || '#111827'} onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, textColor: e.target.value } })} className="input flex-1 text-sm" />
                </div>
              </div>
              {settings.branding?.accentColor && (
                <button onClick={() => setSettings({ ...settings, branding: undefined })} className="text-xs text-gray-500 hover:text-gray-700">
                  Reset to defaults
                </button>
              )}

              <hr className="border-gray-200" />

              <h4 className="text-sm font-medium text-gray-900">Thank You Screen</h4>
              <div className="form-field">
                <label className="form-label">Heading</label>
                <input type="text" value={settings.thankYou?.heading || ''} onChange={(e) => setSettings({ ...settings, thankYou: { ...settings.thankYou, heading: e.target.value } })} className="input" placeholder="Thank you!" />
              </div>
              <div className="form-field">
                <label className="form-label">Message</label>
                <textarea value={settings.thankYou?.message || ''} onChange={(e) => setSettings({ ...settings, thankYou: { ...settings.thankYou, message: e.target.value } })} className="input min-h-20" placeholder="Your response has been submitted successfully." />
              </div>
              <div className="form-field">
                <label className="form-label">Redirect URL</label>
                <input type="url" value={settings.thankYou?.redirectUrl || ''} onChange={(e) => setSettings({ ...settings, thankYou: { ...settings.thankYou, redirectUrl: e.target.value } })} className="input" placeholder="https://example.com/thanks" />
                <p className="text-xs text-gray-500 mt-1">Redirect after submission instead of showing thank you screen</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="text-sm text-gray-900">Show &quot;Powered by Forma&quot;</label>
                  <p className="text-xs text-gray-500">Display branding on form</p>
                </div>
                <button
                  onClick={() => {
                    if (requirePro('Remove branding')) return;
                    setSettings({ ...settings, thankYou: { ...settings.thankYou, showBranding: settings.thankYou?.showBranding === false ? true : false } });
                  }}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative',
                    settings.thankYou?.showBranding !== false ? 'bg-safety-orange' : 'bg-gray-300'
                  )}
                >
                  <div className={cn('w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow', settings.thankYou?.showBranding !== false ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
              </div>

              <button onClick={saveSettings} disabled={saving || !hasChanges} className={cn('btn btn-primary', !hasChanges && 'opacity-50')}>
                {saving ? <><Spinner size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Link & Customizations */}
        {activeTab === 'link' && (
          <div className="card p-6 space-y-5">
            <h3 className="font-medium text-gray-900">Link & Customizations Settings</h3>
            <div className="space-y-4 max-w-lg">
              <div className="form-field">
                <label className="form-label">Custom URL Slug</label>
                <p className="text-xs text-gray-500 mb-2">For custom domains: forms.yourdomain.com/<strong>{slug || 'your-slug'}</strong></p>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className="input"
                  placeholder="e.g., contact, registration"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Direct Link</label>
                <div className="flex gap-2">
                  <code className="input font-mono text-sm text-safety-orange flex-1 truncate">{formPageUrl}</code>
                  <button onClick={() => copyToClipboard(formPageUrl, 'link')} className="btn btn-secondary">
                    {copied === 'link' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <hr className="border-gray-200" />

              <h4 className="text-sm font-medium text-gray-900">Social Preview</h4>
              <p className="text-xs text-gray-500">How your link appears when shared on social media.</p>

              <div className="form-field">
                <label className="form-label">Title <span className="text-gray-400 font-normal normal-case">(max 60 chars)</span></label>
                <input
                  type="text"
                  maxLength={60}
                  value={settings.social?.title || ''}
                  onChange={(e) => setSettings({ ...settings, social: { ...settings.social, title: e.target.value } })}
                  className="input"
                  placeholder={name || 'Form title'}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Description <span className="text-gray-400 font-normal normal-case">(max 110 chars)</span></label>
                <input
                  type="text"
                  maxLength={110}
                  value={settings.social?.description || ''}
                  onChange={(e) => setSettings({ ...settings, social: { ...settings.social, description: e.target.value } })}
                  className="input"
                  placeholder="Fill out this form"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Social Preview Image {planType === 'free' && <span className="badge badge-accent ml-1">Pro</span>}</label>
                <p className="text-xs text-gray-500 mb-2">Recommended size 1200x630. Should be less than 5MB.</p>
                {settings.social?.ogImage ? (
                  <div className="relative">
                    <img src={settings.social.ogImage} alt="OG Preview" className="w-full max-h-40 object-cover rounded-lg border border-gray-200" />
                    <button
                      onClick={() => setSettings({ ...settings, social: { ...settings.social, ogImage: undefined } })}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow text-gray-500 hover:text-red-500"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={(e) => {
                      if (requirePro('Social preview image')) return;
                      const input = (e.currentTarget as HTMLElement).querySelector('input');
                      input?.click();
                    }}
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors border-gray-300 hover:border-safety-orange/50"
                  >
                    <UploadSimple size={24} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">Click to upload image</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('folder', 'og-images');
                        if (currentWorkspace?.id) fd.append('workspaceId', currentWorkspace.id);
                        try {
                          const res = await fetch('/api/upload', { method: 'POST', body: fd });
                          const data = await res.json();
                          if (data.url) {
                            setSettings({ ...settings, social: { ...settings.social, ogImage: data.url } });
                          }
                        } catch { /* ignore */ }
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="form-field">
                <label className="form-label">Favicon {planType === 'free' && <span className="badge badge-accent ml-1">Pro</span>}</label>
                <p className="text-xs text-gray-500 mb-2">Recommended size 60x60. Ideally .ico or .png image.</p>
                {settings.social?.favicon ? (
                  <div className="flex items-center gap-3">
                    <img src={settings.social.favicon} alt="Favicon" className="w-8 h-8 rounded border border-gray-200" />
                    <button
                      onClick={() => setSettings({ ...settings, social: { ...settings.social, favicon: undefined } })}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={(e) => {
                      if (requirePro('Favicon')) return;
                      const input = (e.currentTarget as HTMLElement).querySelector('input');
                      input?.click();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer text-sm text-gray-600 transition-colors hover:border-safety-orange/50"
                  >
                    <UploadSimple size={16} />
                    Upload favicon
                    <input
                      type="file"
                      accept=".ico,.png,image/x-icon,image/png"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('folder', 'favicons');
                        if (currentWorkspace?.id) fd.append('workspaceId', currentWorkspace.id);
                        try {
                          const res = await fetch('/api/upload', { method: 'POST', body: fd });
                          const data = await res.json();
                          if (data.url) {
                            setSettings({ ...settings, social: { ...settings.social, favicon: data.url } });
                          }
                        } catch { /* ignore */ }
                      }}
                    />
                  </div>
                )}
              </div>

              <hr className="border-gray-200" />

              {/* Custom CSS - hidden until properly implemented */}

              <button onClick={saveSettings} disabled={saving || !hasChanges} className={cn('btn btn-primary', !hasChanges && 'opacity-50')}>
                {saving ? <><Spinner size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Hidden Fields */}
        {activeTab === 'hidden' && (
          <div className="card p-6 space-y-5">
            <h3 className="font-medium text-gray-900">Hidden Fields & URL Parameters</h3>
            <p className="text-sm text-gray-500">
              Hidden fields capture data without showing them to respondents. Use <code className="bg-gray-100 px-1 rounded">{'{{param}}'}</code> to capture URL query parameters.
            </p>
            {(() => {
              const hiddenFields = form.fields.filter(f => f.type === 'hidden');
              if (hiddenFields.length === 0) {
                return (
                  <div className="py-8 text-center text-gray-400 text-sm">
                    <EyeSlash size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No hidden fields</p>
                    <p className="text-xs mt-1">Add hidden fields in the form editor</p>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  {hiddenFields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{field.label}</div>
                        <div className="text-xs text-gray-500">
                          {field.defaultValue
                            ? `Value: ${field.defaultValue}`
                            : 'No default value'}
                        </div>
                      </div>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{field.id}</code>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400">
                    Example: <code className="bg-gray-100 px-1 rounded">{formPageUrl}?utm_source=google</code>
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Embed & API */}
        {activeTab === 'embed' && (
          <div className="card p-6 space-y-5">
            <h3 className="font-medium text-gray-900">Embed & API</h3>
            <div className="space-y-5">
              <div className="form-field">
                <label className="form-label">API Endpoint</label>
                <div className="flex gap-2">
                  <code className="input font-mono text-xs text-safety-orange flex-1 truncate">POST {apiEndpoint}</code>
                  <button onClick={() => copyToClipboard(apiEndpoint, 'api')} className="btn btn-secondary">
                    {copied === 'api' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">HTML Embed</label>
                <textarea
                  readOnly
                  value={`<form action="${apiEndpoint}" method="POST">\n${form.fields.filter(f => !['page_break', 'hidden', 'image', 'video', 'payment'].includes(f.type)).map(f => `  <label>${f.label}</label>\n  <input type="${f.type === 'textarea' ? 'text' : f.type}" name="${f.id}">`).join('\n')}\n  <button type="submit">Submit</button>\n</form>`}
                  className="input font-mono text-xs h-40 w-full"
                />
                <button
                  onClick={() => copyToClipboard(`<form action="${apiEndpoint}" method="POST">\n${form.fields.filter(f => !['page_break', 'hidden', 'image', 'video', 'payment'].includes(f.type)).map(f => `  <label>${f.label}</label>\n  <input type="${f.type === 'textarea' ? 'text' : f.type}" name="${f.id}">`).join('\n')}\n  <button type="submit">Submit</button>\n</form>`, 'html')}
                  className="btn btn-secondary mt-2"
                >
                  {copied === 'html' ? <Check size={16} /> : <Copy size={16} />}
                  Copy HTML
                </button>
              </div>
              <div className="form-field">
                <label className="form-label">cURL Example</label>
                <textarea
                  readOnly
                  value={`curl -X POST ${apiEndpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '{\n${form.fields.filter(f => !['page_break', 'image', 'video'].includes(f.type)).map(f => `    "${f.id}": "value"`).join(',\n')}\n  }'`}
                  className="input font-mono text-xs h-32 w-full"
                />
                <button
                  onClick={() => copyToClipboard(`curl -X POST ${apiEndpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '{\n${form.fields.filter(f => !['page_break', 'image', 'video'].includes(f.type)).map(f => `    "${f.id}": "value"`).join(',\n')}\n  }'`, 'curl')}
                  className="btn btn-secondary mt-2"
                >
                  {copied === 'curl' ? <Check size={16} /> : <Copy size={16} />}
                  Copy cURL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        {activeTab === 'danger' && (
          <div className="card p-6 border-red-500/20 space-y-4">
            <h3 className="font-medium text-red-600">Danger Zone</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-800">Delete this form</div>
                <div className="text-sm text-gray-500">This will also delete all {submissions.length} submissions</div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30"
              >
                <Trash size={18} />
                Delete Form
              </button>
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Trash size={20} className="text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Are you sure?</p>
                    <p className="text-xs text-gray-500">This will permanently delete <strong>{form.name}</strong> and all {submissions.length} submissions.</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsDeletingForm(true);
                      try {
                        const res = await fetch(`/api/forms/${form.id}`, { method: 'DELETE' });
                        if (res.ok) {
                          window.location.href = '/dashboard/forms';
                        }
                      } finally {
                        setIsDeletingForm(false);
                      }
                    }}
                    disabled={isDeletingForm}
                    className="px-4 py-2 rounded-lg font-medium text-sm text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isDeletingForm ? <Spinner size={16} className="animate-spin" /> : <Trash size={16} />}
                    Delete Forever
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={upgradeFeature}
      />
    </div>
  );
}
