/**
 * Microsoft Teams integration - sends form submissions as Teams webhook messages
 */

import type { IntegrationPayload, IntegrationConfig } from './index';

export async function deliverToTeams(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  if (!config.webhookUrl) {
    throw new Error('Microsoft Teams webhook URL is required');
  }

  // Build facts from submission data
  const facts = Object.entries(payload.data).map(([key, value]) => ({
    name: key,
    value: String(value || '-').slice(0, 500),
  }));

  // Teams Adaptive Card format
  const card = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: 'ef6f2e',
    summary: `New Submission: ${payload.formName}`,
    sections: [
      {
        activityTitle: `New Submission: ${payload.formName}`,
        activitySubtitle: new Date(payload.submittedAt).toLocaleString(),
        activityImage: 'https://forma.app/icon.png',
        facts: facts.slice(0, 10), // Teams limit
        markdown: true,
      },
    ],
    potentialAction: [
      {
        '@type': 'OpenUri',
        name: 'View in Forma',
        targets: [
          {
            os: 'default',
            uri: `https://forma.app/dashboard/forms/${payload.formId}`,
          },
        ],
      },
    ],
  };

  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Microsoft Teams webhook failed (${response.status}): ${text}`);
  }
}
