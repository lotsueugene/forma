'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  GlobeHemisphereWest,
  LinkSimple,
  Spinner,
  Trash,
  Plus,
  ArrowsClockwise,
  CheckCircle,
  XCircle,
  SlackLogo,
  GoogleLogo,
  Table,
  Database,
  Lightning,
  ChartBar,
  Cloud,
  DiscordLogo,
  MicrosoftTeamsLogo,
  EnvelopeSimple,
  Plugs,
  WebhooksLogo,
} from '@phosphor-icons/react';
import { useWorkspace } from '@/contexts/workspace-context';
import { useSearchParams } from 'next/navigation';

interface FormOption {
  id: string;
  name: string;
  slug: string | null;
}

interface CustomDomainState {
  id: string;
  domain: string;
  verificationToken: string;
  status: 'pending' | 'verified';
  verifiedAt: string | null;
  defaultFormId: string | null;
  defaultForm: FormOption | null;
}

interface WebhookEndpointState {
  id: string;
  name: string;
  url: string;
  events: string[] | string;
  active: boolean;
  lastTriggeredAt: string | null;
  lastStatusCode: number | null;
  lastError: string | null;
  createdAt: string;
}

interface IntegrationState {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  formId?: string | null;
  formName?: string;
  createdAt: string;
  updatedAt: string;
}

const INTEGRATION_TYPES = [
  { type: 'slack', name: 'Slack', icon: SlackLogo, description: 'Send notifications to a Slack channel' },
  { type: 'google-sheets', name: 'Google Sheets', icon: GoogleLogo, description: 'Add submissions to a spreadsheet' },
  { type: 'notion', name: 'Notion', icon: Database, description: 'Create pages in a Notion database' },
  { type: 'airtable', name: 'Airtable', icon: Table, description: 'Add records to an Airtable base' },
  { type: 'zapier', name: 'Zapier', icon: Lightning, description: 'Connect to 5000+ apps via Zapier' },
  { type: 'hubspot', name: 'HubSpot', icon: ChartBar, description: 'Create contacts and deals in HubSpot CRM' },
  { type: 'salesforce', name: 'Salesforce', icon: Cloud, description: 'Sync leads and contacts to Salesforce' },
  { type: 'discord', name: 'Discord', icon: DiscordLogo, description: 'Post submissions to a Discord channel' },
  { type: 'teams', name: 'Microsoft Teams', icon: MicrosoftTeamsLogo, description: 'Send notifications to Teams channels' },
  { type: 'mailchimp', name: 'Mailchimp', icon: EnvelopeSimple, description: 'Add subscribers to your mailing lists' },
  { type: 'make', name: 'Make (Integromat)', icon: Plugs, description: 'Automate workflows with Make scenarios' },
  { type: 'webhook', name: 'Custom Webhook', icon: WebhooksLogo, description: 'Send data to any URL endpoint' },
] as const;

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-600">Loading...</div>}>
      <IntegrationsPageContent />
    </Suspense>
  );
}

function IntegrationsPageContent() {
  const { currentWorkspace } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [domainFeatureEnabled, setDomainFeatureEnabled] = useState(false);
  const [customDomain, setCustomDomain] = useState<CustomDomainState | null>(null);
  const [availableForms, setAvailableForms] = useState<FormOption[]>([]);
  const [domainInput, setDomainInput] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [savingDefaultForm, setSavingDefaultForm] = useState(false);

  const [webhooksFeatureEnabled, setWebhooksFeatureEnabled] = useState(false);
  const [webhooks, setWebhooks] = useState<WebhookEndpointState[]>([]);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  const [integrationsFeatureEnabled, setIntegrationsFeatureEnabled] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationState[]>([]);
  const [addingIntegrationType, setAddingIntegrationType] = useState<string | null>(null);
  const [integrationConfig, setIntegrationConfig] = useState<Record<string, string>>({});

  // Google Sheets OAuth state
  const searchParams = useSearchParams();
  const [gsConnectingId, setGsConnectingId] = useState<string | null>(null);
  const [gsSpreadsheets, setGsSpreadsheets] = useState<Array<{ id: string; name: string }>>([]);
  const [gsLoadingSheets, setGsLoadingSheets] = useState(false);
  const [gsSelectedSpreadsheet, setGsSelectedSpreadsheet] = useState('');
  const [gsSheetName, setGsSheetName] = useState('Sheet1');

  const load = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);

    try {
      const [domainRes, webhooksRes, integrationsRes] = await Promise.all([
        fetch(`/api/workspaces/${currentWorkspace.id}/custom-domain`),
        fetch(`/api/workspaces/${currentWorkspace.id}/webhooks`),
        fetch(`/api/workspaces/${currentWorkspace.id}/integrations`),
      ]);

      if (domainRes.ok) {
        const data = await domainRes.json();
        setDomainFeatureEnabled(Boolean(data.featureEnabled));
        setCustomDomain(data.domain || null);
        setDomainInput(data.domain?.domain || '');
        setAvailableForms(data.forms || []);
      } else if (domainRes.status === 402) {
        setDomainFeatureEnabled(false);
        setCustomDomain(null);
        setAvailableForms([]);
      } else {
        const text = await domainRes.text().catch(() => '');
        setError(`Failed to load custom domain (${domainRes.status}): ${text || domainRes.statusText}`);
      }

      if (webhooksRes.ok) {
        const data = await webhooksRes.json();
        setWebhooksFeatureEnabled(true);
        setWebhooks(data.endpoints || []);
      } else if (webhooksRes.status === 402) {
        setWebhooksFeatureEnabled(false);
        setWebhooks([]);
      } else {
        const text = await webhooksRes.text().catch(() => '');
        setError((prev) => prev || `Failed to load webhooks (${webhooksRes.status}): ${text || webhooksRes.statusText}`);
      }

      if (integrationsRes.ok) {
        const data = await integrationsRes.json();
        setIntegrationsFeatureEnabled(true);
        setIntegrations(data.integrations || []);

        // Check for incomplete Google Sheets integrations (missing spreadsheetId)
        const gsIntegrations = (data.integrations || []).filter(
          (i: IntegrationState) => i.type === 'google-sheets'
        );
        for (const gs of gsIntegrations) {
          const detailRes = await fetch(
            `/api/workspaces/${currentWorkspace.id}/integrations/${gs.id}`
          );
          if (detailRes.ok) {
            const detail = await detailRes.json();
            if (!detail.integration?.config?.spreadsheetId ||
                detail.integration.config.spreadsheetId === '...' ||
                detail.integration.config.spreadsheetId.length < 10) {
              // Incomplete — trigger the spreadsheet picker
              setGsConnectingId(gs.id);
              setGsLoadingSheets(true);
              fetch(`/api/integrations/google-sheets/spreadsheets?integrationId=${gs.id}`)
                .then((res) => res.json())
                .then((sheetsData) => {
                  if (sheetsData.spreadsheets) {
                    setGsSpreadsheets(sheetsData.spreadsheets);
                  } else if (sheetsData.error) {
                    setError(sheetsData.error);
                  }
                })
                .catch(() => setError('Failed to load spreadsheets'))
                .finally(() => setGsLoadingSheets(false));
              break;
            }
          }
        }
      } else if (integrationsRes.status === 402) {
        setIntegrationsFeatureEnabled(false);
        setIntegrations([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    load();
  }, [load]);

  // Handle Google Sheets OAuth callback
  useEffect(() => {
    const connectedId = searchParams.get('google_sheets_connected');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setError(`Google Sheets: ${oauthError}`);
      window.history.replaceState({}, '', '/dashboard/integrations');
    }

    if (connectedId) {
      setGsConnectingId(connectedId);
      setGsLoadingSheets(true);
      fetch(`/api/integrations/google-sheets/spreadsheets?integrationId=${connectedId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.spreadsheets) {
            setGsSpreadsheets(data.spreadsheets);
          } else if (data.error) {
            setError(data.error);
          }
        })
        .catch(() => setError('Failed to load spreadsheets'))
        .finally(() => setGsLoadingSheets(false));
      window.history.replaceState({}, '', '/dashboard/integrations');
      load(); // Refresh integrations list
    }
  }, [searchParams, load]);

  const connectedCount = useMemo(() => {
    let n = 0;
    if (customDomain?.status === 'verified') n += 1;
    if (webhooks.some((w) => w.active)) n += 1;
    n += integrations.filter((i) => i.enabled).length;
    return n;
  }, [customDomain?.status, webhooks, integrations]);

  const saveDomain = async () => {
    if (!currentWorkspace || !domainInput.trim()) return;
    setSavingDomain(true);
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/custom-domain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Failed (${res.status})`);
      }
      setCustomDomain(data.domain);
      setDomainInput(data.domain.domain);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save custom domain');
    } finally {
      setSavingDomain(false);
    }
  };

  const verifyDomain = async () => {
    if (!currentWorkspace) return;
    setVerifyingDomain(true);
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/custom-domain/verify`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Verification failed (${res.status})`);
      }
      setCustomDomain(data.domain);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to verify custom domain');
    } finally {
      setVerifyingDomain(false);
    }
  };

  const saveDefaultForm = async (formId: string | null) => {
    if (!currentWorkspace) return;
    setSavingDefaultForm(true);
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/custom-domain`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultFormId: formId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Failed (${res.status})`);
      }
      setCustomDomain(data.domain);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update default form');
    } finally {
      setSavingDefaultForm(false);
    }
  };

  const removeDomain = async () => {
    if (!currentWorkspace) return;
    const res = await fetch(`/api/workspaces/${currentWorkspace.id}/custom-domain`, { method: 'DELETE' });
    if (res.ok) {
      setCustomDomain(null);
      setDomainInput('');
      setError(null);
    }
  };

  const addWebhook = async () => {
    if (!currentWorkspace || !newWebhookUrl.trim()) return;
    setCreatingWebhook(true);
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWebhookName || undefined,
          url: newWebhookUrl.trim(),
          events: ['submission.created'],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Failed (${res.status})`);
      }
      setWebhooks((prev) => [data.endpoint, ...prev]);
      setNewWebhookName('');
      setNewWebhookUrl('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create webhook');
    } finally {
      setCreatingWebhook(false);
    }
  };

  const toggleWebhook = async (id: string, active: boolean) => {
    if (!currentWorkspace) return;
    const res = await fetch(`/api/workspaces/${currentWorkspace.id}/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, active } : w)));
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!currentWorkspace) return;
    const res = await fetch(`/api/workspaces/${currentWorkspace.id}/webhooks/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    }
  };

  const addIntegration = async (type: string) => {
    if (!currentWorkspace) return;
    setAddingIntegrationType(type);
    setError(null);

    try {
      // Build config based on type
      const config: Record<string, string> = {};

      if (type === 'slack') {
        if (!integrationConfig.webhookUrl) {
          setError('Slack webhook URL is required');
          return;
        }
        config.webhookUrl = integrationConfig.webhookUrl;
      } else if (type === 'notion') {
        if (!integrationConfig.apiKey || !integrationConfig.databaseId) {
          setError('Notion API key and database ID are required');
          return;
        }
        config.apiKey = integrationConfig.apiKey;
        config.databaseId = integrationConfig.databaseId;
      } else if (type === 'airtable') {
        if (!integrationConfig.apiKey || !integrationConfig.baseId || !integrationConfig.tableId) {
          setError('Airtable API key, base ID, and table ID are required');
          return;
        }
        config.apiKey = integrationConfig.apiKey;
        config.baseId = integrationConfig.baseId;
        config.tableId = integrationConfig.tableId;
      } else if (type === 'google-sheets') {
        // Google Sheets uses OAuth flow — handled by the "Connect with Google" button
        return;
      }

      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, config, testConnection: true, formId: integrationConfig.formId || null }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Failed (${res.status})`);
      }

      setIntegrations((prev) => [data.integration, ...prev]);
      setIntegrationConfig({});
      setAddingIntegrationType(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add integration');
    } finally {
      setAddingIntegrationType(null);
    }
  };

  const finishGoogleSheetsSetup = async () => {
    if (!currentWorkspace || !gsConnectingId || !gsSelectedSpreadsheet) return;
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/integrations/${gsConnectingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          config: { spreadsheetId: gsSelectedSpreadsheet, sheetName: gsSheetName || 'Sheet1' },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      setGsConnectingId(null);
      setGsSpreadsheets([]);
      setGsSelectedSpreadsheet('');
      setGsSheetName('Sheet1');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to finish Google Sheets setup');
    }
  };

  const toggleIntegration = async (id: string, enabled: boolean) => {
    if (!currentWorkspace) return;
    const res = await fetch(`/api/workspaces/${currentWorkspace.id}/integrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      setIntegrations((prev) => prev.map((i) => (i.id === id ? { ...i, enabled } : i)));
    }
  };

  const deleteIntegration = async (id: string) => {
    if (!currentWorkspace) return;
    const res = await fetch(`/api/workspaces/${currentWorkspace.id}/integrations/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const getIntegrationIcon = (type: string) => {
    const found = INTEGRATION_TYPES.find((t) => t.type === type);
    return found?.icon || LinkSimple;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
        <p className="text-gray-600">{connectedCount} production integrations active</p>
      </div>

      {error && (
        <div className="card p-4 border border-red-500/20 bg-red-500/10 text-red-600 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="btn btn-ghost text-red-600">
            Dismiss
          </button>
        </div>
      )}

      {/* Google Sheets spreadsheet picker (shown after OAuth) */}
      {gsConnectingId && (
        <div className="card p-5 space-y-4 border-safety-orange/30">
          <h2 className="font-medium text-gray-900 flex items-center gap-2">
            <GoogleLogo size={18} />
            Finish Google Sheets Setup
          </h2>
          {gsLoadingSheets ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Spinner size={16} className="animate-spin" />
              Loading your spreadsheets...
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Select a spreadsheet</label>
                {gsSpreadsheets.length > 0 ? (
                  <select
                    className="input text-sm"
                    value={gsSelectedSpreadsheet}
                    onChange={(e) => setGsSelectedSpreadsheet(e.target.value)}
                  >
                    <option value="">Choose a spreadsheet...</option>
                    {gsSpreadsheets.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="Paste Google Sheets URL or spreadsheet ID"
                      value={gsSelectedSpreadsheet}
                      onChange={(e) => {
                        let val = e.target.value;
                        // Extract ID from URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
                        const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                        if (match) val = match[1];
                        setGsSelectedSpreadsheet(val);
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Open your spreadsheet and copy the URL from the browser address bar.
                    </p>
                  </>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Sheet name (tab)</label>
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="Sheet1"
                  value={gsSheetName}
                  onChange={(e) => setGsSheetName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={finishGoogleSheetsSetup}
                  disabled={!gsSelectedSpreadsheet}
                >
                  <CheckCircle size={16} />
                  Activate
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-gray-600"
                  onClick={() => {
                    if (currentWorkspace) {
                      deleteIntegration(gsConnectingId);
                    }
                    setGsConnectingId(null);
                    setGsSpreadsheets([]);
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Connected Integrations */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900 flex items-center gap-2">
            <LinkSimple size={18} />
            Connected Integrations
          </h2>
          {!loading && !integrationsFeatureEnabled && <span className="badge badge-warning">Trial/Pro required</span>}
        </div>

        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : !integrationsFeatureEnabled ? (
          <p className="text-sm text-gray-600">Upgrade to Trial or Pro to connect integrations like Slack, Notion, and more.</p>
        ) : (
          <>
            {/* Integration type cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {INTEGRATION_TYPES.map((intType) => {
                const Icon = intType.icon;
                const connected = integrations.find((i) => i.type === intType.type && i.enabled);
                return (
                  <button
                    key={intType.type}
                    type="button"
                    onClick={() => setAddingIntegrationType(intType.type)}
                    className={`p-4 rounded-lg border transition-colors text-left ${
                      connected
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                    }`}
                  >
                    <Icon size={24} className={connected ? 'text-emerald-600' : 'text-gray-700'} />
                    <div className="mt-2 text-sm font-medium text-gray-900">{intType.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {connected ? 'Connected' : 'Click to connect'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Add integration modal/form */}
            {addingIntegrationType && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    Connect {INTEGRATION_TYPES.find((t) => t.type === addingIntegrationType)?.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setAddingIntegrationType(null); setIntegrationConfig({}); }}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                {addingIntegrationType === 'slack' && (
                  <>
                    <p className="text-xs text-gray-600">
                      Create an Incoming Webhook in your Slack workspace and paste the URL below.
                    </p>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://hooks.slack.com/services/..."
                      value={integrationConfig.webhookUrl || ''}
                      onChange={(e) => setIntegrationConfig({ ...integrationConfig, webhookUrl: e.target.value })}
                    />
                  </>
                )}

                {addingIntegrationType === 'notion' && (
                  <>
                    <p className="text-xs text-gray-600">
                      Create an internal integration in Notion and share your database with it.
                    </p>
                    <input
                      type="text"
                      className="input"
                      placeholder="Notion API Key (secret_...)"
                      value={integrationConfig.apiKey || ''}
                      onChange={(e) => setIntegrationConfig({ ...integrationConfig, apiKey: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Database ID"
                      value={integrationConfig.databaseId || ''}
                      onChange={(e) => setIntegrationConfig({ ...integrationConfig, databaseId: e.target.value })}
                    />
                  </>
                )}

                {addingIntegrationType === 'airtable' && (
                  <>
                    <p className="text-xs text-gray-600">
                      Create a personal access token in Airtable with read/write access to your base.
                    </p>
                    <input
                      type="text"
                      className="input"
                      placeholder="Airtable API Key (pat...)"
                      value={integrationConfig.apiKey || ''}
                      onChange={(e) => setIntegrationConfig({ ...integrationConfig, apiKey: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Base ID (app...)"
                      value={integrationConfig.baseId || ''}
                      onChange={(e) => setIntegrationConfig({ ...integrationConfig, baseId: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Table ID or name"
                      value={integrationConfig.tableId || ''}
                      onChange={(e) => setIntegrationConfig({ ...integrationConfig, tableId: e.target.value })}
                    />
                  </>
                )}

                {addingIntegrationType === 'google-sheets' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-600">
                      Connect your Google account to automatically add form submissions to a spreadsheet.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary inline-flex items-center gap-2"
                      onClick={async () => {
                        if (!currentWorkspace) return;
                        try {
                          const formId = integrationConfig.formId || '';
                          const res = await fetch(
                            `/api/integrations/google-sheets/authorize?workspaceId=${currentWorkspace.id}&formId=${formId}`
                          );
                          const data = await res.json();
                          if (data.authUrl) {
                            window.location.href = data.authUrl;
                          } else {
                            setError(data.error || 'Failed to start Google authorization');
                          }
                        } catch {
                          setError('Failed to start Google authorization');
                        }
                      }}
                    >
                      <GoogleLogo size={18} />
                      Connect with Google
                    </button>
                  </div>
                )}

                {/* Form selector — which form triggers this integration */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Trigger on</label>
                  <select
                    className="input text-sm"
                    value={integrationConfig.formId || ''}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, formId: e.target.value })}
                  >
                    <option value="">All forms</option>
                    {availableForms.map((form) => (
                      <option key={form.id} value={form.id}>{form.name}</option>
                    ))}
                  </select>
                </div>

                {addingIntegrationType !== 'google-sheets' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => addIntegration(addingIntegrationType)}
                  >
                    <Plus size={16} />
                    Connect
                  </button>
                )}
              </div>
            )}

            {/* Connected integrations list */}
            {integrations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Active Integrations</h3>
                {integrations.map((integration) => {
                  const Icon = getIntegrationIcon(integration.type);
                  return (
                    <div key={integration.id} className="flex items-center justify-between border border-gray-200 rounded p-3">
                      <div className="flex items-center gap-3">
                        <Icon size={20} className={integration.enabled ? 'text-emerald-600' : 'text-gray-600'} />
                        <div>
                          <div className="text-sm text-gray-900">{integration.name}</div>
                          <div className="text-xs text-gray-600">
                            {integration.type}
                            {integration.formId ? ` · ${availableForms.find(f => f.id === integration.formId)?.name || 'Specific form'}` : ' · All forms'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleIntegration(integration.id, !integration.enabled)}
                          className={`btn btn-ghost text-xs ${integration.enabled ? 'text-emerald-300' : 'text-gray-700'}`}
                        >
                          {integration.enabled ? 'Active' : 'Paused'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost text-red-600"
                          onClick={() => deleteIntegration(integration.id)}
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900 flex items-center gap-2">
              <GlobeHemisphereWest size={18} />
              Custom Domain
            </h2>
            {!loading && !domainFeatureEnabled && <span className="badge badge-warning">Pro required</span>}
          </div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : !domainFeatureEnabled ? (
            <p className="text-sm text-gray-600">Upgrade to Pro to connect your own domain for hosted form URLs.</p>
          ) : customDomain?.status === 'verified' ? (
            /* ── Verified domain view ── */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600" />
                  <code className="text-sm font-medium text-emerald-800">{customDomain.domain}</code>
                </div>
                <button type="button" className="text-xs text-red-500 hover:text-red-700 font-medium" onClick={removeDomain}>
                  Remove
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Default form (root URL)
                </label>
                <div className="flex items-center gap-2">
                  <select
                    className="input flex-1"
                    value={customDomain.defaultFormId || ''}
                    onChange={(e) => saveDefaultForm(e.target.value || null)}
                    disabled={savingDefaultForm}
                  >
                    <option value="">First active form</option>
                    {availableForms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.name} {form.slug ? `(/${form.slug})` : ''}
                      </option>
                    ))}
                  </select>
                  {savingDefaultForm && <Spinner size={16} className="animate-spin text-gray-400" />}
                </div>
              </div>

              {/* Form URLs on this domain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Form URLs</label>
                <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
                  {availableForms.map((form) => (
                    <div key={form.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-gray-700 truncate">{form.name}</span>
                      {form.slug ? (
                        <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0 ml-2">/{form.slug}</code>
                      ) : (
                        <span className="text-xs text-gray-400 italic shrink-0 ml-2">No slug set</span>
                      )}
                    </div>
                  ))}
                  {availableForms.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">No active forms</div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Set a slug in each form&apos;s settings to make it available at {customDomain.domain}/<strong>slug</strong>
                </p>
              </div>
            </div>
          ) : (
            /* ── No domain or pending verification ── */
            <>
              <input
                type="text"
                className="input"
                placeholder="forms.yourdomain.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap">
                {(!customDomain || domainInput.trim() !== customDomain.domain) && (
                  <button type="button" className="btn btn-primary" onClick={saveDomain} disabled={savingDomain || !domainInput.trim()}>
                    {savingDomain ? <Spinner size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {customDomain ? 'Update' : 'Save'}
                  </button>
                )}
                {customDomain && (
                  <button type="button" className="btn btn-secondary" onClick={verifyDomain} disabled={verifyingDomain}>
                    {verifyingDomain ? <Spinner size={16} className="animate-spin" /> : <ArrowsClockwise size={16} />}
                    Verify DNS
                  </button>
                )}
                {customDomain && (
                  <button type="button" className="btn btn-ghost text-red-600" onClick={removeDomain}>
                    <Trash size={16} />
                    Remove
                  </button>
                )}
              </div>

              {customDomain && (() => {
                const parts = customDomain.domain.split('.');
                const isSubdomain = parts.length > 2;
                const subdomain = isSubdomain ? parts[0] : '@';
                const txtHost = isSubdomain ? `_forma-verification.${subdomain}` : '_forma-verification';

                return (
                  <div className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <XCircle size={14} className="text-amber-500" />
                      <span className="text-amber-600 font-medium">Pending verification</span>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-700">Step 1: Add A record</div>
                      <div className="grid grid-cols-[80px_1fr] gap-1 text-gray-600">
                        <span>Type:</span><code className="bg-white px-1 rounded">A</code>
                        <span>Host:</span><code className="bg-white px-1 rounded">{subdomain}</code>
                        <span>Value:</span><code className="bg-white px-1 rounded">SERVER_IP_REDACTED</code>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-700">Step 2: Add TXT record</div>
                      <div className="grid grid-cols-[80px_1fr] gap-1 text-gray-600">
                        <span>Type:</span><code className="bg-white px-1 rounded">TXT</code>
                        <span>Host:</span><code className="bg-white px-1 rounded">{txtHost}</code>
                        <span>Value:</span><code className="bg-white px-1 rounded break-all">{customDomain.verificationToken}</code>
                      </div>
                    </div>
                    <p className="text-gray-500">DNS changes can take up to 48 hours. Click &quot;Verify DNS&quot; after adding both records.</p>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900 flex items-center gap-2">
              <LinkSimple size={18} />
              Webhooks
            </h2>
            {!loading && !webhooksFeatureEnabled && <span className="badge badge-warning">Trial/Pro required</span>}
          </div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : !webhooksFeatureEnabled ? (
            <p className="text-sm text-gray-600">Upgrade to Trial/Pro to deliver signed <code>submission.created</code> payloads.</p>
          ) : (
            <>
              <input
                type="text"
                className="input"
                placeholder="Webhook name (optional)"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
              />
              <input
                type="url"
                className="input"
                placeholder="https://example.com/webhooks/forma"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={addWebhook}
                disabled={creatingWebhook || !newWebhookUrl.trim()}
              >
                {creatingWebhook ? <Spinner size={16} className="animate-spin" /> : <Plus size={16} />}
                Add webhook
              </button>

              <div className="space-y-2 max-h-72 overflow-auto">
                {loading ? (
                  <div className="text-sm text-gray-600">Loading…</div>
                ) : webhooks.length === 0 ? (
                  <div className="text-sm text-gray-600">No webhook endpoints yet.</div>
                ) : (
                  webhooks.map((w) => (
                    <div key={w.id} className="border border-gray-200 rounded p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 truncate">{w.name}</div>
                          <div className="text-xs text-gray-600 truncate">{w.url}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleWebhook(w.id, !w.active)}
                            className={`btn btn-ghost text-xs ${w.active ? 'text-emerald-300' : 'text-gray-700'}`}
                          >
                            {w.active ? 'Active' : 'Paused'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost text-red-600"
                            onClick={() => deleteWebhook(w.id)}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Last: {w.lastStatusCode ? `HTTP ${w.lastStatusCode}` : 'Never'}
                        {w.lastError ? ` · ${w.lastError}` : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
