/**
 * Discord integration - sends form submissions as Discord webhook messages
 */

import type { IntegrationPayload, IntegrationConfig } from './index';

export async function deliverToDiscord(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  if (!config.webhookUrl) {
    throw new Error('Discord webhook URL is required');
  }

  // Build embed fields from submission data
  const fields = Object.entries(payload.data).map(([key, value]) => ({
    name: key,
    value: String(value || '-').slice(0, 1024),
    inline: String(value || '').length < 50,
  }));

  const embed = {
    title: `New Submission: ${payload.formName}`,
    color: 0xef6f2e, // Forma orange
    fields: fields.slice(0, 25), // Discord limit
    timestamp: payload.submittedAt,
    footer: {
      text: 'Forma',
    },
  };

  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [embed],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Discord webhook failed (${response.status}): ${text}`);
  }
}
