/**
 * Integration delivery engine
 * Handles sending submission data to connected third-party services
 */

import { prisma } from '@/lib/prisma';
import { deliverToSlack } from './slack';
import { deliverToNotion } from './notion';
import { deliverToAirtable } from './airtable';
import { deliverToGoogleSheets } from './google-sheets';
import { deliverToDiscord } from './discord';
import { deliverToWebhook, deliverToZapier, deliverToMake } from './webhook';
import { deliverToHubSpot } from './hubspot';
import { deliverToSalesforce } from './salesforce';
import { deliverToTeams } from './teams';
import { deliverToMailchimp } from './mailchimp';

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
  // Slack / Discord / Teams
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

/**
 * Deliver submission to all active integrations for a workspace
 * Non-blocking - failures are logged but don't throw
 */
export async function deliverToIntegrations(
  payload: IntegrationPayload
): Promise<DeliveryResult[]> {
  const results: DeliveryResult[] = [];

  try {
    // Fetch all active integrations for this workspace
    const integrations = await prisma.integration.findMany({
      where: {
        workspaceId: payload.workspaceId,
        enabled: true,
      },
    });

    if (integrations.length === 0) {
      return results;
    }

    // Deliver to each integration in parallel
    const deliveryPromises = integrations.map(async (integration) => {
      const config = JSON.parse(integration.config) as IntegrationConfig;

      try {
        switch (integration.type) {
          case 'slack':
            await deliverToSlack(payload, config);
            break;
          case 'notion':
            await deliverToNotion(payload, config);
            break;
          case 'airtable':
            await deliverToAirtable(payload, config);
            break;
          case 'google-sheets':
            await deliverToGoogleSheets(payload, config);
            break;
          case 'discord':
            await deliverToDiscord(payload, config);
            break;
          case 'zapier':
            await deliverToZapier(payload, config);
            break;
          case 'make':
            await deliverToMake(payload, config);
            break;
          case 'webhook':
            await deliverToWebhook(payload, config);
            break;
          case 'hubspot':
            await deliverToHubSpot(payload, config);
            break;
          case 'salesforce':
            await deliverToSalesforce(payload, config);
            break;
          case 'teams':
            await deliverToTeams(payload, config);
            break;
          case 'mailchimp':
            await deliverToMailchimp(payload, config);
            break;
          default:
            throw new Error(`Unknown integration type: ${integration.type}`);
        }

        // Update last triggered timestamp
        await prisma.integration.update({
          where: { id: integration.id },
          data: { updatedAt: new Date() },
        });

        return {
          success: true,
          integrationId: integration.id,
          integrationType: integration.type,
        };
      } catch (error) {
        console.error(
          `Integration delivery failed [${integration.type}]:`,
          error
        );
        return {
          success: false,
          integrationId: integration.id,
          integrationType: integration.type,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const settled = await Promise.allSettled(deliveryPromises);

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  } catch (error) {
    console.error('Error fetching integrations:', error);
  }

  return results;
}

/**
 * Test an integration configuration
 */
export async function testIntegration(
  type: string,
  config: IntegrationConfig
): Promise<{ success: boolean; error?: string }> {
  const testPayload: IntegrationPayload = {
    submissionId: 'test-submission-id',
    formId: 'test-form-id',
    formName: 'Test Form',
    workspaceId: 'test-workspace-id',
    submittedAt: new Date().toISOString(),
    data: {
      name: 'Test User',
      email: 'test@example.com',
      message: 'This is a test submission from Forma.',
    },
  };

  try {
    switch (type) {
      case 'slack':
        await deliverToSlack(testPayload, config);
        break;
      case 'notion':
        await deliverToNotion(testPayload, config);
        break;
      case 'airtable':
        await deliverToAirtable(testPayload, config);
        break;
      case 'google-sheets':
        await deliverToGoogleSheets(testPayload, config);
        break;
      case 'discord':
        await deliverToDiscord(testPayload, config);
        break;
      case 'zapier':
        await deliverToZapier(testPayload, config);
        break;
      case 'make':
        await deliverToMake(testPayload, config);
        break;
      case 'webhook':
        await deliverToWebhook(testPayload, config);
        break;
      case 'hubspot':
        await deliverToHubSpot(testPayload, config);
        break;
      case 'salesforce':
        await deliverToSalesforce(testPayload, config);
        break;
      case 'teams':
        await deliverToTeams(testPayload, config);
        break;
      case 'mailchimp':
        await deliverToMailchimp(testPayload, config);
        break;
      default:
        return { success: false, error: `Unknown integration type: ${type}` };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export type { IntegrationPayload as SubmissionPayload };
