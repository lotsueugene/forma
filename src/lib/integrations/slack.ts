/**
 * Slack integration
 * Sends form submissions to Slack channels via incoming webhooks
 */

import type { IntegrationPayload, IntegrationConfig } from './index';

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: Array<{ type: string; text: string }>;
  elements?: Array<{ type: string; text: string | { type: string; text: string; emoji?: boolean }; url?: string }>;
}

/**
 * Send submission notification to Slack
 */
export async function deliverToSlack(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  const { webhookUrl } = config;

  if (!webhookUrl) {
    throw new Error('Slack webhook URL is required');
  }

  // Build Slack Block Kit message
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📬 New submission: ${payload.formName}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Form:* ${payload.formName}\n*Received:* ${new Date(payload.submittedAt).toLocaleString()}`,
      },
    },
    {
      type: 'divider',
    },
  ];

  // Add submission data as fields (max 10 fields per section)
  const dataEntries = Object.entries(payload.data);
  const fieldChunks = chunkArray(dataEntries, 10);

  for (const chunk of fieldChunks) {
    const fields = chunk.map(([key, value]) => ({
      type: 'mrkdwn',
      text: `*${escapeMarkdown(key)}*\n${escapeMarkdown(formatValue(value))}`,
    }));

    blocks.push({
      type: 'section',
      fields,
    });
  }

  // Add context with submission ID
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Submission ID: ${payload.submissionId}`,
      },
    ],
  });

  // Add action button to view in dashboard
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'View in Forma',
          emoji: true,
        },
        url: `${process.env.NEXTAUTH_URL || 'https://forma.app'}/dashboard/forms/${payload.formId}`,
      },
    ],
  } as SlackBlock);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      blocks,
      text: `New submission: ${payload.formName}`, // Fallback for notifications
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Slack API error: ${response.status} - ${errorText}`);
  }
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '_empty_';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  const str = String(value);
  // Truncate long values
  return str.length > 500 ? str.slice(0, 497) + '...' : str;
}

/**
 * Escape Slack markdown characters
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[&<>]/g, (char) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
    return map[char];
  });
}

/**
 * Split array into chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
