/**
 * Notion integration
 * Adds form submissions as pages to a Notion database
 */

import type { IntegrationPayload, IntegrationConfig } from './index';

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API_URL = 'https://api.notion.com/v1';

interface NotionProperty {
  type: string;
  title?: Array<{ text: { content: string } }>;
  rich_text?: Array<{ text: { content: string } }>;
  number?: number;
  checkbox?: boolean;
  date?: { start: string };
  email?: string;
  url?: string;
  select?: { name: string };
}

/**
 * Send submission to Notion database
 */
export async function deliverToNotion(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  const { apiKey, databaseId, fieldMapping } = config;

  if (!apiKey) {
    throw new Error('Notion API key is required');
  }

  if (!databaseId) {
    throw new Error('Notion database ID is required');
  }

  // First, get the database schema to understand property types
  const schemaResponse = await fetch(`${NOTION_API_URL}/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_API_VERSION,
    },
  });

  if (!schemaResponse.ok) {
    const error = await schemaResponse.json();
    throw new Error(`Failed to fetch Notion database: ${error.message || schemaResponse.status}`);
  }

  const schema = await schemaResponse.json() as {
    properties: Record<string, { type: string; name: string }>;
  };

  // Build properties based on schema and submission data
  const properties: Record<string, NotionProperty> = {};

  // Add form metadata
  properties['Form Name'] = createNotionProperty(payload.formName, 'title', schema.properties['Form Name']);
  properties['Submitted At'] = createNotionProperty(payload.submittedAt, 'date', schema.properties['Submitted At']);

  // Add submission data
  for (const [key, value] of Object.entries(payload.data)) {
    // Use field mapping if provided, otherwise use the key as-is
    const propertyName = fieldMapping?.[key] || key;
    const propertySchema = schema.properties[propertyName];

    if (propertySchema) {
      properties[propertyName] = createNotionProperty(value, propertySchema.type, propertySchema);
    } else {
      // Default to rich_text for unknown properties
      properties[propertyName] = createNotionProperty(value, 'rich_text', null);
    }
  }

  // Create the page
  const response = await fetch(`${NOTION_API_URL}/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
      children: [
        {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `Submission ID: ${payload.submissionId}`,
                },
              },
            ],
            icon: { emoji: '📬' },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Notion API error: ${error.message || response.status}`);
  }
}

/**
 * Create a Notion property value based on type
 */
function createNotionProperty(
  value: unknown,
  type: string,
  _schema: { type: string; name: string } | null
): NotionProperty {
  const stringValue = formatValue(value);

  switch (type) {
    case 'title':
      return {
        type: 'title',
        title: [{ text: { content: stringValue.slice(0, 2000) } }],
      };

    case 'rich_text':
      return {
        type: 'rich_text',
        rich_text: [{ text: { content: stringValue.slice(0, 2000) } }],
      };

    case 'number':
      const num = parseFloat(String(value));
      return {
        type: 'number',
        number: isNaN(num) ? 0 : num,
      };

    case 'checkbox':
      return {
        type: 'checkbox',
        checkbox: Boolean(value),
      };

    case 'date':
      return {
        type: 'date',
        date: { start: value ? new Date(String(value)).toISOString() : new Date().toISOString() },
      };

    case 'email':
      return {
        type: 'email',
        email: stringValue.slice(0, 200),
      };

    case 'url':
      return {
        type: 'url',
        url: stringValue.slice(0, 2000),
      };

    case 'select':
      return {
        type: 'select',
        select: { name: stringValue.slice(0, 100) },
      };

    default:
      // Default to rich_text
      return {
        type: 'rich_text',
        rich_text: [{ text: { content: stringValue.slice(0, 2000) } }],
      };
  }
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
