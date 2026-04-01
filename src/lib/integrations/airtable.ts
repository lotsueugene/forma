/**
 * Airtable integration
 * Adds form submissions as records to an Airtable base
 */

import type { IntegrationPayload, IntegrationConfig } from './index';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

/**
 * Send submission to Airtable
 */
export async function deliverToAirtable(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  const { apiKey, baseId, tableId, fieldMapping } = config;

  if (!apiKey) {
    throw new Error('Airtable API key is required');
  }

  if (!baseId) {
    throw new Error('Airtable base ID is required');
  }

  if (!tableId) {
    throw new Error('Airtable table ID is required');
  }

  // Build fields object
  const fields: Record<string, unknown> = {};

  // Add metadata fields
  fields['Form Name'] = payload.formName;
  fields['Submitted At'] = payload.submittedAt;
  fields['Submission ID'] = payload.submissionId;

  // Add submission data
  for (const [key, value] of Object.entries(payload.data)) {
    // Use field mapping if provided, otherwise use the key as-is
    const fieldName = fieldMapping?.[key] || key;
    fields[fieldName] = formatValueForAirtable(value);
  }

  // Create the record
  const response = await fetch(`${AIRTABLE_API_URL}/${baseId}/${encodeURIComponent(tableId)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields,
      typecast: true, // Automatically convert values to the correct type
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(`Airtable API error: ${error.error?.message || response.status}`);
  }
}

/**
 * Format a value for Airtable
 * Airtable handles most types automatically with typecast: true
 */
function formatValueForAirtable(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  // Arrays are used for linked records and multiselect
  if (Array.isArray(value)) {
    return value.map((v) => formatValueForAirtable(v));
  }

  // Objects should be stringified (except dates)
  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return JSON.stringify(value);
  }

  // Booleans work as checkbox fields
  if (typeof value === 'boolean') {
    return value;
  }

  // Numbers work directly
  if (typeof value === 'number') {
    return value;
  }

  // Strings are truncated to Airtable's limit (100,000 chars for long text)
  const str = String(value);
  return str.length > 100000 ? str.slice(0, 99997) + '...' : str;
}

/**
 * List tables in an Airtable base (for UI configuration)
 */
export async function listAirtableTables(
  apiKey: string,
  baseId: string
): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(`${AIRTABLE_API_URL}/meta/bases/${baseId}/tables`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list tables: ${response.status}`);
  }

  const data = await response.json() as {
    tables: Array<{ id: string; name: string }>;
  };

  return data.tables.map((t) => ({ id: t.id, name: t.name }));
}

/**
 * List bases for an Airtable account (for UI configuration)
 */
export async function listAirtableBases(
  apiKey: string
): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(`${AIRTABLE_API_URL}/meta/bases`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list bases: ${response.status}`);
  }

  const data = await response.json() as {
    bases: Array<{ id: string; name: string }>;
  };

  return data.bases.map((b) => ({ id: b.id, name: b.name }));
}
