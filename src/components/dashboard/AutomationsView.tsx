'use client';

import { useState, useEffect } from 'react';
import { Plus, Lightning, Trash, EnvelopeSimple, Clock, Check, X, CaretDown, ClockCounterClockwise, PencilSimple } from '@phosphor-icons/react';
import Link from 'next/link';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface AutomationAction {
  type: 'send_email';
  to: 'respondent' | 'custom';
  customEmail?: string;
  subject: string;
  body: string;
  delay: number; // minutes. 0 = immediate
}

interface Automation {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  actions: AutomationAction[];
  conditions: null;
  createdAt: string;
}

interface Props {
  formId: string;
  fields: Array<{ id: string; type: string; label: string }>;
}

const DELAY_OPTIONS = [
  { value: 0, label: 'Immediately' },
  { value: 60, label: '1 hour later' },
  { value: 360, label: '6 hours later' },
  { value: 1440, label: '1 day later' },
  { value: 2880, label: '2 days later' },
  { value: 4320, label: '3 days later' },
  { value: 10080, label: '1 week later' },
];

function formatDelay(minutes: number): string {
  if (minutes === 0) return 'Immediately';
  if (minutes < 60) return `${minutes} min later`;
  if (minutes < 1440) return `${minutes / 60} hour${minutes / 60 !== 1 ? 's' : ''} later`;
  const days = minutes / 1440;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} later`;
  return `${days / 7} week${days / 7 !== 1 ? 's' : ''} later`;
}

export default function AutomationsView({ formId, fields }: Props) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  // New automation form state
  const [newName, setNewName] = useState('');
  const [newActions, setNewActions] = useState<AutomationAction[]>([
    { type: 'send_email', to: 'respondent', subject: '', body: '', delay: 0 },
  ]);

  // Fetch automations
  useEffect(() => {
    fetch(`/api/forms/${formId}/automations`)
      .then(res => res.ok ? res.json() : { automations: [] })
      .then(data => setAutomations(data.automations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [formId]);

  // createAutomation is now handled by saveAutomation above

  const startEditing = (automation: Automation) => {
    setEditingId(automation.id);
    setNewName(automation.name);
    setNewActions(automation.actions);
    setShowCreate(true);
  };

  const [formError, setFormError] = useState('');

  const saveAutomation = async () => {
    setFormError('');
    if (!newName.trim()) {
      setFormError('Please enter an automation name');
      return;
    }
    const emptySubject = newActions.find(a => !a.subject.trim());
    if (emptySubject) {
      setFormError('Please enter a subject for all email actions');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        const res = await fetch(`/api/forms/${formId}/automations`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            automationId: editingId,
            name: newName,
            actions: newActions,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAutomations(prev => prev.map(a => a.id === editingId ? data.automation : a));
        }
      } else {
        // Create new
        const res = await fetch(`/api/forms/${formId}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newName,
            trigger: 'submission',
            actions: newActions,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAutomations(prev => [...prev, data.automation]);
        }
      }
      resetForm();
    } catch {}
    setSaving(false);
  };

  const resetForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setNewName('');
    setNewActions([{ type: 'send_email', to: 'respondent', subject: '', body: '', delay: 0 }]);
  };

  const toggleAutomation = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/forms/${formId}/automations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationId: id, enabled }),
      });
      if (res.ok) {
        setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled } : a));
      }
    } catch {}
  };

  const deleteAutomation = async (id: string) => {
    try {
      const res = await fetch(`/api/forms/${formId}/automations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationId: id }),
      });
      if (res.ok) {
        setAutomations(prev => prev.filter(a => a.id !== id));
      }
    } catch {}
  };

  const addAction = () => {
    setNewActions(prev => [
      ...prev,
      { type: 'send_email', to: 'respondent', subject: '', body: '', delay: 1440 },
    ]);
  };

  const updateAction = (index: number, updates: Partial<AutomationAction>) => {
    setNewActions(prev => prev.map((a, i) => i === index ? { ...a, ...updates } : a));
  };

  const removeAction = (index: number) => {
    if (newActions.length <= 1) return;
    setNewActions(prev => prev.filter((_, i) => i !== index));
  };

  // Get available template variables from form fields
  const templateVars = fields
    .filter(f => !['page_break', 'hidden', 'image', 'video', 'payment'].includes(f.type))
    .map(f => ({ id: f.id, label: f.label }));

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">Loading automations...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Existing automations */}
      {automations.length > 0 && (
        <div className="space-y-3">
          {automations.map((automation) => (
            <div key={automation.id} className="card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${automation.enabled ? 'bg-safety-orange/10' : 'bg-gray-100'}`}>
                    <Lightning size={16} weight="fill" className={automation.enabled ? 'text-safety-orange' : 'text-gray-400'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{automation.name}</p>
                    <p className="text-xs text-gray-400">
                      {automation.actions.length} action{automation.actions.length !== 1 ? 's' : ''} &middot; On submission
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAutomation(automation.id, !automation.enabled)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      automation.enabled ? 'bg-safety-orange' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      automation.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === automation.id ? null : automation.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <CaretDown size={14} className={`transition-transform ${expandedId === automation.id ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditing(automation)}
                    className="p-1.5 text-gray-400 hover:text-safety-orange hover:bg-safety-orange/10 rounded transition-colors"
                  >
                    <PencilSimple size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAutomation(automation.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded view */}
              {expandedId === automation.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {automation.actions.map((action, i) => (
                    <div key={i}>
                      <button
                        type="button"
                        onClick={() => setExpandedAction(expandedAction === `${automation.id}-${i}` ? null : `${automation.id}-${i}`)}
                        className="w-full flex items-start gap-3 text-left"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          {action.delay === 0 ? (
                            <EnvelopeSimple size={12} className="text-gray-500" />
                          ) : (
                            <Clock size={12} className="text-gray-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-700 font-medium">{action.subject}</p>
                          <p className="text-xs text-gray-400">
                            {formatDelay(action.delay)} &middot; To {action.to === 'respondent' ? 'respondent' : action.customEmail}
                          </p>
                          {expandedAction !== `${automation.id}-${i}` && action.body && (
                            <p className="text-xs text-gray-400 mt-1 truncate">{action.body.replace(/<[^>]*>/g, '').slice(0, 80)}...</p>
                          )}
                        </div>
                        <CaretDown size={12} className={`text-gray-400 shrink-0 mt-1.5 transition-transform ${expandedAction === `${automation.id}-${i}` ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedAction === `${automation.id}-${i}` && (
                        <div className="mt-2 ml-9 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 whitespace-pre-wrap break-words">
                          {action.body.replace(/<[^>]*>/g, '')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create automation form */}
      {showCreate ? (
        <div className="card p-4 sm:p-5 space-y-4 border-safety-orange/30">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Automation Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Welcome email, Follow-up sequence"
              className="input w-full"
              autoFocus
            />
          </div>

          <div className="space-y-4">
            <label className="text-xs font-medium text-gray-600 block">When a form is submitted:</label>

            {newActions.map((action, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-safety-orange/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-safety-orange">{i + 1}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700">Send Email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={action.delay}
                      onChange={(e) => updateAction(i, { delay: parseInt(e.target.value) })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600"
                    >
                      {DELAY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {newActions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAction(i)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">To</label>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => updateAction(i, { to: 'respondent' })}
                      className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        action.to === 'respondent' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      Respondent
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAction(i, { to: 'custom' })}
                      className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        action.to === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      Custom Email
                    </button>
                  </div>
                  {action.to === 'custom' && (
                    <input
                      type="email"
                      value={action.customEmail || ''}
                      onChange={(e) => updateAction(i, { customEmail: e.target.value })}
                      placeholder="email@example.com"
                      className="input w-full mt-2"
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Subject</label>
                  <input
                    type="text"
                    value={action.subject}
                    onChange={(e) => updateAction(i, { subject: e.target.value })}
                    placeholder="e.g. Thanks for your submission!"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Body
                    <span className="text-gray-400 ml-1">(HTML supported)</span>
                  </label>
                  <textarea
                    value={action.body}
                    onChange={(e) => updateAction(i, { body: e.target.value })}
                    placeholder={`Hi {{name}},\n\nThank you for reaching out! We'll get back to you shortly.\n\nBest regards`}
                    className="input w-full min-h-[120px] resize-y"
                    rows={5}
                  />
                </div>

                {/* Template variables */}
                {templateVars.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Available variables</p>
                    <div className="flex flex-wrap gap-1">
                      {templateVars.map(v => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            const tag = `{{${v.label.toLowerCase().replace(/\s+/g, '_')}}}`;
                            updateAction(i, { body: action.body + tag });
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 hover:bg-safety-orange/10 hover:text-safety-orange transition-colors"
                        >
                          {`{{${v.label.toLowerCase().replace(/\s+/g, '_')}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addAction}
              className="text-sm text-safety-orange hover:text-accent-200 font-medium flex items-center gap-1.5"
            >
              <Plus size={14} weight="bold" />
              Add follow-up email
            </button>
          </div>

          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={saveAutomation}
              disabled={saving}
              className="btn btn-primary text-sm"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Automation'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-ghost text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {automations.length === 0 ? (
            <div className="card p-8 sm:p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-safety-orange/10 flex items-center justify-center mx-auto mb-4">
                <Lightning size={24} weight="fill" className="text-safety-orange" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No automations yet</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                Send auto-reply emails, follow-up sequences, and more when someone submits this form.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="btn btn-primary mx-auto flex"
              >
                <Plus size={14} weight="bold" />
                Create Automation
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="text-sm text-safety-orange hover:text-accent-200 font-medium flex items-center gap-1.5"
            >
              <Plus size={14} weight="bold" />
              Create Automation
            </button>
          )}
        </div>
      )}

      {/* Email log link */}
      {automations.length > 0 && (
        <Link
          href={`/dashboard/forms/${formId}/emails`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ClockCounterClockwise size={16} />
          View email log
        </Link>
      )}
    </div>
  );
}
