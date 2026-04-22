/**
 * Single source of truth for every integration type's metadata:
 *   - human name + description (UI)
 *   - secret fields that must be redacted in GET responses
 *   - validator (config shape check, URL-safety for webhook URLs)
 *   - completeness check (does this row have enough config to deliver?)
 *
 * Both the UI tile grid and the API create/validate path consume this
 * catalog, so we can't end up with "UI says supported, server says no."
 */

import type { IntegrationConfig } from './index';
import { checkUrlSafety } from '@/lib/http-safety';

export type IntegrationKind = 'webhook' | 'apiKey' | 'oauth';

export interface IntegrationMeta {
  type: string;
  name: string;
  description: string;
  kind: IntegrationKind;
  /** Fields in the config that should never be returned raw from GET endpoints. */
  secretFields: ReadonlyArray<keyof IntegrationConfig | string>;
  /** Validate config shape. Return an error string or null. */
  validate: (config: IntegrationConfig) => string | null;
  /** Does this integration have enough config to deliver? */
  isComplete: (config: IntegrationConfig) => boolean;
}

function validateWebhookUrl(url: string | undefined, label: string, hostPattern?: RegExp): string | null {
  if (!url) return `${label} URL is required`;
  const safety = checkUrlSafety(url);
  if (!safety.safe) return `${label} URL is not allowed: ${safety.reason}`;
  if (hostPattern && !hostPattern.test(url)) {
    return `${label} URL does not match the expected host format`;
  }
  return null;
}

export const INTEGRATION_CATALOG: Record<string, IntegrationMeta> = {
  slack: {
    type: 'slack',
    name: 'Slack',
    description: 'Post a formatted message to a Slack channel on each submission.',
    kind: 'webhook',
    secretFields: ['webhookUrl'],
    validate: (c) =>
      validateWebhookUrl(
        c.webhookUrl,
        'Slack webhook',
        /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+$/
      ),
    isComplete: (c) => Boolean(c.webhookUrl),
  },

  discord: {
    type: 'discord',
    name: 'Discord',
    description: 'Post a rich embed to a Discord channel on each submission.',
    kind: 'webhook',
    secretFields: ['webhookUrl'],
    validate: (c) =>
      validateWebhookUrl(
        c.webhookUrl,
        'Discord webhook',
        /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//
      ),
    isComplete: (c) => Boolean(c.webhookUrl),
  },

  teams: {
    type: 'teams',
    name: 'Microsoft Teams',
    description: 'Post an adaptive card to a Microsoft Teams channel on each submission.',
    kind: 'webhook',
    secretFields: ['webhookUrl'],
    validate: (c) =>
      validateWebhookUrl(
        c.webhookUrl,
        'Teams webhook',
        // Accepts both *.webhook.office.com and the newer *.office.com hosts.
        /^https:\/\/[a-z0-9-]+\.(webhook\.)?office\.com\//
      ),
    isComplete: (c) => Boolean(c.webhookUrl),
  },

  webhook: {
    type: 'webhook',
    name: 'Custom Webhook',
    description: 'POST a signed JSON payload to any HTTPS endpoint you control.',
    kind: 'webhook',
    secretFields: ['webhookUrl', 'webhookSecret'],
    validate: (c) => validateWebhookUrl(c.webhookUrl, 'Webhook'),
    isComplete: (c) => Boolean(c.webhookUrl),
  },

  zapier: {
    type: 'zapier',
    name: 'Zapier',
    description: 'Trigger a Zapier Zap by POSTing to its webhook URL.',
    kind: 'webhook',
    secretFields: ['webhookUrl'],
    validate: (c) =>
      validateWebhookUrl(c.webhookUrl, 'Zapier webhook', /^https:\/\/hooks\.zapier\.com\//),
    isComplete: (c) => Boolean(c.webhookUrl),
  },

  make: {
    type: 'make',
    name: 'Make (Integromat)',
    description: 'Trigger a Make scenario by POSTing to its webhook URL.',
    kind: 'webhook',
    secretFields: ['webhookUrl'],
    validate: (c) =>
      validateWebhookUrl(
        c.webhookUrl,
        'Make webhook',
        /^https:\/\/hook\.(eu\d+|us\d+|integromat)\.make\.com\//
      ),
    isComplete: (c) => Boolean(c.webhookUrl),
  },

  notion: {
    type: 'notion',
    name: 'Notion',
    description: 'Create a page in a Notion database for each submission.',
    kind: 'apiKey',
    secretFields: ['apiKey'],
    validate: (c) => {
      if (!c.apiKey) return 'Notion API key is required';
      if (!/^(secret_|ntn_)/.test(c.apiKey)) {
        return 'Notion API key must start with "secret_" or "ntn_"';
      }
      if (!c.databaseId) return 'Notion database ID is required';
      return null;
    },
    isComplete: (c) => Boolean(c.apiKey && c.databaseId),
  },

  airtable: {
    type: 'airtable',
    name: 'Airtable',
    description: 'Append a record to an Airtable table for each submission.',
    kind: 'apiKey',
    secretFields: ['apiKey'],
    validate: (c) => {
      if (!c.apiKey) return 'Airtable API key is required';
      if (!/^pat[A-Za-z0-9]/.test(c.apiKey)) {
        return 'Airtable API key must be a personal access token (pat...)';
      }
      if (!c.baseId) return 'Airtable base ID is required';
      if (!c.tableId) return 'Airtable table ID is required';
      return null;
    },
    isComplete: (c) => Boolean(c.apiKey && c.baseId && c.tableId),
  },

  'google-sheets': {
    type: 'google-sheets',
    name: 'Google Sheets',
    description: 'Append submissions as rows in a Google Sheets spreadsheet.',
    kind: 'oauth',
    secretFields: ['accessToken', 'refreshToken'],
    validate: (c) => {
      if (!c.accessToken && !c.refreshToken) {
        return 'Google account must be connected via OAuth';
      }
      // spreadsheetId is optional at create time — the OAuth callback makes
      // an incomplete row and the picker completes it.
      return null;
    },
    isComplete: (c) =>
      Boolean((c.accessToken || c.refreshToken) && c.spreadsheetId && String(c.spreadsheetId).length >= 10),
  },

  hubspot: {
    type: 'hubspot',
    name: 'HubSpot',
    description: 'Create contacts in HubSpot CRM from form submissions.',
    kind: 'apiKey',
    secretFields: ['apiKey'],
    validate: (c) => {
      if (!c.apiKey) return 'HubSpot access token is required';
      if (!/^pat-(na|eu)\d+-/.test(c.apiKey)) {
        return 'HubSpot token must be a private app access token (starts with "pat-...")';
      }
      return null;
    },
    isComplete: (c) => Boolean(c.apiKey),
  },

  salesforce: {
    type: 'salesforce',
    name: 'Salesforce',
    description: 'Create Leads in Salesforce from form submissions.',
    kind: 'apiKey',
    secretFields: ['accessToken'],
    validate: (c) => {
      if (!c.accessToken) return 'Salesforce session / bearer token is required';
      if (!c.instanceUrl) return 'Salesforce instance URL is required';
      const safety = checkUrlSafety(c.instanceUrl);
      if (!safety.safe) return `Salesforce instance URL is not allowed: ${safety.reason}`;
      if (!/^https:\/\/[a-z0-9-]+\.(my\.salesforce|my-salesforce|force)\.com\/?$/.test(c.instanceUrl)) {
        return 'Salesforce instance URL must be an official my.salesforce.com or force.com domain';
      }
      return null;
    },
    isComplete: (c) => Boolean(c.accessToken && c.instanceUrl),
  },

  mailchimp: {
    type: 'mailchimp',
    name: 'Mailchimp',
    description: 'Subscribe emails to a Mailchimp audience.',
    kind: 'apiKey',
    secretFields: ['apiKey'],
    validate: (c) => {
      if (!c.apiKey) return 'Mailchimp API key is required';
      if (!/-[a-z]{2}\d+$/.test(c.apiKey)) {
        return 'Mailchimp API key must be in the format "key-dcNN"';
      }
      if (!c.listId) return 'Mailchimp audience (list) ID is required';
      return null;
    },
    isComplete: (c) => Boolean(c.apiKey && c.listId),
  },
} as const;

export const ALL_INTEGRATION_TYPES = Object.keys(INTEGRATION_CATALOG);

export function getIntegrationMeta(type: string): IntegrationMeta | null {
  return INTEGRATION_CATALOG[type] || null;
}

/**
 * Remove secret fields (per the catalog) and replace them with a safe
 * prefix-only redaction. Never returns the original value.
 */
export function redactConfigForDisplay(
  type: string,
  config: IntegrationConfig
): Record<string, unknown> {
  const meta = getIntegrationMeta(type);
  const out: Record<string, unknown> = { ...config };

  // Always redact an explicit denylist plus anything the catalog marks
  // as secret. Covers future fields that inherit common names.
  const globallySensitive = new Set(['apiKey', 'accessToken', 'refreshToken', 'webhookUrl', 'webhookSecret']);
  const secretFields = new Set<string>([
    ...Array.from(globallySensitive),
    ...((meta?.secretFields as string[]) || []),
  ]);

  for (const key of secretFields) {
    if (typeof out[key] === 'string' && out[key]) {
      const v = out[key] as string;
      // Show only a short non-sensitive prefix. No tail bytes.
      out[key] = v.length <= 4 ? '••••' : v.slice(0, 4) + '••••••••';
    }
  }
  return out;
}
