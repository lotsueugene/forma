/**
 * Integration delivery engine
 * Handles sending submission data to connected third-party services
 *
 * Responsibilities:
 *   - Load active integrations for a form/workspace from the DB
 *   - Decrypt each integration's config (see integration-secrets.ts)
 *   - SSRF-guard webhook-family deliveries against internal addresses
 *   - Dispatch to the provider-specific delivery fn
 *   - Record lastRunAt / lastStatus / lastError so the dashboard can show
 *     per-integration health without a separate delivery-log table
 *
 * This path is best-effort — it never blocks the submission response and
 * never throws into the caller. Failures are captured on the row.
 */

import { prisma } from '@/lib/prisma';
import { decryptConfig } from '@/lib/integration-secrets';
import { deliverToSlack } from './slack';
import { deliverToNotion } from './notion';
import { deliverToAirtable } from './airtable';
import {
  deliverToGoogleSheets,
  assertSpreadsheetWritable,
  refreshAccessToken,
} from './google-sheets';
import { deliverToDiscord } from './discord';
import { deliverToWebhook, deliverToZapier, deliverToMake } from './webhook';
import { deliverToHubSpot } from './hubspot';
import { deliverToSalesforce } from './salesforce';
import { deliverToTeams } from './teams';
import { deliverToMailchimp } from './mailchimp';
import { assertUrlSafe } from '@/lib/http-safety';

export interface IntegrationPayload {
  submissionId: string;
  formId: string;
  formName: string;
  workspaceId: string;
  submittedAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IntegrationConfig {
  // Slack / Discord / Teams / Custom Webhook / Zapier / Make
  webhookUrl?: string;
  channel?: string;

  // Google Sheets
  accessToken?: string;
  refreshToken?: string;
  spreadsheetId?: string;
  sheetName?: string;

  // Notion
  apiKey?: string;
  databaseId?: string;
  fieldMapping?: Record<string, string>;

  // Airtable
  baseId?: string;
  tableId?: string;

  // Generic Webhook / Zapier / Make
  webhookSecret?: string;

  // Salesforce
  instanceUrl?: string;

  // Mailchimp
  listId?: string;
  doubleOptIn?: boolean;
  tags?: string;
}

export interface DeliveryResult {
  success: boolean;
  integrationId: string;
  integrationType: string;
  error?: string;
}

/** Integration types whose delivery fn `fetch()`es a user-supplied URL. */
const WEBHOOK_FAMILY = new Set(['webhook', 'zapier', 'make', 'discord', 'teams', 'slack']);

/**
 * Dispatch to a provider-specific delivery function. Exported so the
 * manual-test endpoint can exercise the exact same path as real deliveries.
 */
export async function runIntegrationDelivery(
  type: string,
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  // Belt-and-suspenders SSRF guard on the delivery path. The API layer
  // also validates on create, but configs can be legacy/hand-edited rows
  // and this is the actual `fetch()` site so we re-check.
  if (WEBHOOK_FAMILY.has(type) && config.webhookUrl) {
    assertUrlSafe(config.webhookUrl, `${type} webhook URL`);
  }
  if (type === 'salesforce' && config.instanceUrl) {
    assertUrlSafe(config.instanceUrl, 'Salesforce instance URL');
  }

  switch (type) {
    case 'slack':        return deliverToSlack(payload, config);
    case 'notion':       return deliverToNotion(payload, config);
    case 'airtable':     return deliverToAirtable(payload, config);
    case 'google-sheets':return deliverToGoogleSheets(payload, config);
    case 'discord':      return deliverToDiscord(payload, config);
    case 'zapier':       return deliverToZapier(payload, config);
    case 'make':         return deliverToMake(payload, config);
    case 'webhook':      return deliverToWebhook(payload, config);
    case 'hubspot':      return deliverToHubSpot(payload, config);
    case 'salesforce':   return deliverToSalesforce(payload, config);
    case 'teams':        return deliverToTeams(payload, config);
    case 'mailchimp':    return deliverToMailchimp(payload, config);
    default:             throw new Error(`Unknown integration type: ${type}`);
  }
}

/**
 * Deliver submission to all active integrations for a workspace.
 * Non-blocking — failures are logged but don't throw.
 */
export async function deliverToIntegrations(
  payload: IntegrationPayload
): Promise<DeliveryResult[]> {
  const results: DeliveryResult[] = [];

  try {
    const integrations = await prisma.integration.findMany({
      where: {
        workspaceId: payload.workspaceId,
        enabled: true,
        OR: [
          { formId: null },
          { formId: payload.formId },
        ],
      },
    });

    if (integrations.length === 0) return results;

    const deliveryPromises = integrations.map(async (integration) => {
      let config: IntegrationConfig;
      try {
        config = decryptConfig<IntegrationConfig>(integration.config);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordDeliveryResult(integration.id, 'error', null, `Config decrypt failed: ${msg}`);
        return {
          success: false,
          integrationId: integration.id,
          integrationType: integration.type,
          error: msg,
        };
      }

      try {
        await runIntegrationDelivery(integration.type, payload, config);
        await recordDeliveryResult(integration.id, 'success', 200, null);
        return {
          success: true,
          integrationId: integration.id,
          integrationType: integration.type,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        // Try to parse an HTTP status from the message (our delivery fns
        // format errors as "... (NNN): body").
        const statusMatch = msg.match(/\((\d{3})\)/);
        const status = statusMatch ? parseInt(statusMatch[1], 10) : null;
        console.error(`Integration delivery failed [${integration.type}]:`, msg);
        await recordDeliveryResult(integration.id, 'error', status, msg);
        return {
          success: false,
          integrationId: integration.id,
          integrationType: integration.type,
          error: msg,
        };
      }
    });

    const settled = await Promise.allSettled(deliveryPromises);
    for (const result of settled) {
      if (result.status === 'fulfilled') results.push(result.value);
    }
  } catch (error) {
    console.error('Error fetching integrations:', error);
  }

  return results;
}

/** Persist the most recent delivery attempt. Swallows errors. */
async function recordDeliveryResult(
  integrationId: string,
  status: 'success' | 'error',
  statusCode: number | null,
  error: string | null
): Promise<void> {
  try {
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastRunAt: new Date(),
        lastStatus: status,
        lastStatusCode: statusCode,
        lastError: error ? error.slice(0, 500) : null,
      },
    });
  } catch (e) {
    console.error('Failed to record integration delivery result:', e);
  }
}

/**
 * Test an integration configuration with a synthetic payload.
 *
 * Note: this sends a real request to the provider — users should be
 * made aware in the UI so a "test" Slack post doesn't surprise them.
 */
export async function testIntegration(
  type: string,
  config: IntegrationConfig
): Promise<{ success: boolean; error?: string }> {
  // Google Sheets gets a special non-destructive test: we validate the
  // spreadsheet ID, confirm the OAuth account can both READ and WRITE,
  // but we do NOT append a "Forma Test" row to the user's real sheet.
  // That kind of pollution is why users disable tests in other tools.
  if (type === 'google-sheets') {
    try {
      if (!config.spreadsheetId) {
        return { success: false, error: 'No spreadsheet selected.' };
      }
      // Prefer a freshly-minted access token via refresh so we don't
      // spuriously 401 on a stale token. The refresh doesn't persist
      // here (we don't have the integration id), but delivery's own
      // refreshAndSaveToken path will persist on the next submission.
      let accessToken = config.accessToken;
      if (config.refreshToken) {
        try {
          accessToken = (await refreshAccessToken(config.refreshToken)).accessToken;
        } catch {
          // Fall back to whatever token we have; preflight will 401 if dead.
        }
      }
      if (!accessToken) {
        return { success: false, error: 'Google account not connected.' };
      }
      await assertSpreadsheetWritable(accessToken, config.spreadsheetId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const testPayload: IntegrationPayload = {
    submissionId: 'test-submission-id',
    formId: 'test-form-id',
    formName: 'Test Form (Forma)',
    workspaceId: 'test-workspace-id',
    submittedAt: new Date().toISOString(),
    data: {
      name: 'Forma Test',
      email: 'test@forma.example',
      message: 'This is a test submission from Forma — safe to ignore.',
    },
  };

  try {
    await runIntegrationDelivery(type, testPayload, config);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}


export type { IntegrationPayload as SubmissionPayload };
