/**
 * Generic webhook integration - sends form submissions to any URL
 * Works with Zapier, Make (Integromat), and custom endpoints
 */

import crypto from 'crypto';
import type { IntegrationPayload, IntegrationConfig } from './index';

export async function deliverToWebhook(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  if (!config.webhookUrl) {
    throw new Error('Webhook URL is required');
  }

  const body = {
    event: 'form.submission',
    timestamp: payload.submittedAt,
    form: {
      id: payload.formId,
      name: payload.formName,
    },
    submission: {
      id: payload.submissionId,
      data: payload.data,
      metadata: payload.metadata,
    },
  };

  const bodyString = JSON.stringify(body);

  // Create HMAC signature if secret is provided
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Forma-Event': 'form.submission',
    'X-Forma-Delivery-Id': payload.submissionId,
  };

  if (config.webhookSecret) {
    const signature = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(bodyString)
      .digest('hex');
    headers['X-Forma-Signature'] = `sha256=${signature}`;
  }

  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers,
    body: bodyString,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Webhook delivery failed (${response.status}): ${text}`);
  }
}

/**
 * Deliver to Zapier - uses the generic webhook format
 */
export async function deliverToZapier(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  return deliverToWebhook(payload, config);
}

/**
 * Deliver to Make (Integromat) - uses the generic webhook format
 */
export async function deliverToMake(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  return deliverToWebhook(payload, config);
}
