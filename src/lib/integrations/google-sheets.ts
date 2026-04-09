/**
 * Google Sheets integration
 * Appends form submissions as rows to a Google Sheet
 * Uses OAuth2 for authentication
 */

import type { IntegrationPayload, IntegrationConfig } from './index';
import { prisma } from '@/lib/prisma';

const GOOGLE_OAUTH_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Send submission to Google Sheets
 */
export async function deliverToGoogleSheets(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  let accessToken = config.accessToken;
  const { refreshToken, spreadsheetId, sheetName } = config;

  if (!accessToken && !refreshToken) {
    throw new Error('Google Sheets access token or refresh token is required');
  }

  if (!spreadsheetId) {
    throw new Error('Google Sheets spreadsheet ID is required');
  }

  // If we have a refresh token, try to refresh the access token
  if (refreshToken) {
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      accessToken = newTokens.accessToken;
      // Note: In a real implementation, you'd want to save the new access token
      // back to the integration config
    } catch (error) {
      console.error('Failed to refresh Google access token:', error);
      if (!accessToken) {
        throw new Error('Failed to refresh Google access token');
      }
    }
  }

  // At this point, accessToken must be defined
  if (!accessToken) {
    throw new Error('Google Sheets access token is required');
  }

  // Get spreadsheet metadata to find sheet ID
  const range = sheetName ? `${sheetName}!A:ZZ` : 'Sheet1!A:ZZ';

  // First, check if we need to add headers
  const headersResponse = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!headersResponse.ok) {
    if (headersResponse.status === 401) {
      throw new Error('Google Sheets authentication expired. Please reconnect.');
    }
    const error = await headersResponse.json().catch(() => ({}));
    throw new Error(`Google Sheets API error: ${(error as { error?: { message?: string } }).error?.message || headersResponse.status}`);
  }

  const headersData = await headersResponse.json() as { values?: string[][] };
  const existingHeaders = headersData.values?.[0] || [];

  // Build the row data
  const submissionData: Record<string, unknown> = {
    'Submitted At': payload.submittedAt,
    'Form Name': payload.formName,
    'Submission ID': payload.submissionId,
    ...payload.data,
  };

  const allKeys = Object.keys(submissionData);

  // If no headers exist, add them first
  if (existingHeaders.length === 0) {
    await appendToSheet(accessToken, spreadsheetId, range, [allKeys]);
  }

  // Use existing headers to determine column order, add new columns if needed
  const headers = existingHeaders.length > 0 ? [...existingHeaders] : allKeys;

  // Add any new keys to headers
  for (const key of allKeys) {
    if (!headers.includes(key)) {
      headers.push(key);
    }
  }

  // If we have new headers, update the header row
  if (headers.length > existingHeaders.length && existingHeaders.length > 0) {
    const headerRange = sheetName ? `${sheetName}!1:1` : 'Sheet1!1:1';
    await updateRow(accessToken, spreadsheetId, headerRange, [headers]);
  }

  // Build the row in the correct column order
  const row = headers.map((header) => {
    const value = submissionData[header];
    return formatValueForSheets(value);
  });

  // Append the row
  await appendToSheet(accessToken, spreadsheetId, range, [row]);
}

/**
 * Append rows to a sheet
 */
async function appendToSheet(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: unknown[][]
): Promise<void> {
  const response = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to append to sheet: ${(error as { error?: { message?: string } }).error?.message || response.status}`);
  }
}

/**
 * Update a specific row
 */
async function updateRow(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: unknown[][]
): Promise<void> {
  const response = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to update sheet: ${(error as { error?: { message?: string } }).error?.message || response.status}`);
  }
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const response = await fetch(GOOGLE_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Token refresh failed: ${(error as { error?: string }).error || response.status}`);
  }

  const data = await response.json() as { access_token: string };
  return { accessToken: data.access_token };
}

/**
 * Refresh and persist the new access token to the database
 */
export async function refreshAndSaveToken(
  integrationId: string,
  refreshToken: string
): Promise<string> {
  const { accessToken } = await refreshAccessToken(refreshToken);

  // Save the new access token back to the integration
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });
  if (integration) {
    const config = JSON.parse(integration.config);
    config.accessToken = accessToken;
    await prisma.integration.update({
      where: { id: integrationId },
      data: { config: JSON.stringify(config) },
    });
  }

  return accessToken;
}

/**
 * Format a value for Google Sheets
 */
function formatValueForSheets(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Exchange authorization code for tokens (used during OAuth flow)
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const response = await fetch(GOOGLE_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${(error as { error?: string }).error || response.status}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Build the Google OAuth authorization URL
 */
export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error('Google OAuth client ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * List spreadsheets (for UI configuration)
 * Requires drive.readonly scope
 */
export async function listSpreadsheets(
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name)",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list spreadsheets: ${response.status}`);
  }

  const data = await response.json() as {
    files: Array<{ id: string; name: string }>;
  };

  return data.files || [];
}
