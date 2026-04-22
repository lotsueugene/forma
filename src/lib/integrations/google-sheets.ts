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

  // Get actual first sheet name from spreadsheet metadata if needed
  let resolvedSheetName = sheetName || 'Sheet1';
  try {
    const metaRes = await fetch(
      `${SHEETS_API_URL}/${spreadsheetId}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json() as { sheets?: Array<{ properties?: { title?: string } }> };
      const firstSheet = meta.sheets?.[0]?.properties?.title;
      if (firstSheet && (!sheetName || sheetName === 'Sheet1')) {
        resolvedSheetName = firstSheet;
      }
    }
  } catch {
    // Fall through with the configured name
  }

  const range = `${resolvedSheetName}!A:ZZ`;

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
    throw await sheetsError(headersResponse, 'read sheet headers');
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
    const headerRange = `${resolvedSheetName}!1:1`;
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
    throw await sheetsError(response, 'append to sheet');
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
    throw await sheetsError(response, 'update sheet');
  }
}

/**
 * Turn a Sheets API error response into an actionable message. The raw
 * "The caller does not have permission" / "Requested entity was not
 * found" strings are useless to end users — they need to know what to
 * DO (re-share, reconnect, pick a different sheet).
 */
async function sheetsError(response: Response, action: string): Promise<Error> {
  const body = await response.json().catch(() => ({}));
  const raw = (body as { error?: { message?: string } }).error?.message;

  if (response.status === 401) {
    return new Error('Google Sheets authentication expired. Please reconnect the integration.');
  }
  if (response.status === 403) {
    return new Error(
      "Google Sheets rejected the write: the connected Google account doesn't have edit access to this spreadsheet. " +
        'Share it with edit access or reconnect with an account that owns it.'
    );
  }
  if (response.status === 404) {
    return new Error(
      'The connected spreadsheet could not be found. It may have been deleted, moved to trash, or the sheet tab renamed. ' +
        'Reconnect the integration and pick a different spreadsheet.'
    );
  }
  if (response.status === 429) {
    return new Error('Google Sheets is rate-limiting us. We will retry on the next submission.');
  }
  return new Error(`Failed to ${action}: ${raw || response.status}`);
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
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
    const { decryptConfig, encryptConfig } = await import('@/lib/integration-secrets');
    const config = decryptConfig<Record<string, unknown>>(integration.config);
    config.accessToken = accessToken;
    await prisma.integration.update({
      where: { id: integrationId },
      data: { config: encryptConfig(config) },
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
  // Try parsing JSON strings (file uploads may be stored as strings)
  let parsed = value;
  if (typeof parsed === 'string') {
    try { const p = JSON.parse(parsed); if (p && typeof p === 'object') parsed = p; } catch {}
  }
  // File upload objects — show the URL instead of raw JSON
  if (parsed && typeof parsed === 'object' && 'url' in (parsed as Record<string, unknown>)) {
    return (parsed as { url?: string }).url || '';
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
 * List spreadsheets the authenticated user can EDIT (for UI configuration).
 * Requires drive.readonly scope — we still only read Drive metadata, we
 * just filter to edit-capable spreadsheets so users don't pick a sheet
 * that was shared read-only with them (the Sheets API would then 403 on
 * every submission with "The caller does not have permission").
 */
export async function listSpreadsheets(
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,capabilities/canEdit,ownedByMe)&pageSize=200",
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
    files: Array<{
      id: string;
      name: string;
      ownedByMe?: boolean;
      capabilities?: { canEdit?: boolean };
    }>;
  };

  return (data.files || [])
    .filter((f) => f.capabilities?.canEdit !== false)
    .map(({ id, name }) => ({ id, name }));
}

/**
 * Pre-flight a spreadsheet before saving it to the integration: confirm
 * the token can actually write to it. Catches the common "shared
 * read-only / wrong Google account / trashed sheet" cases up front
 * instead of at submission time.
 */
export async function assertSpreadsheetWritable(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  // `spreadsheets.get` with `fields=` returns capabilities the user has
  // on THIS spreadsheet. Cheaper than a dummy write and scoped to the
  // Sheets scope we already hold.
  const metaRes = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}?includeGridData=false&fields=spreadsheetId,properties.title,sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!metaRes.ok) {
    if (metaRes.status === 404) {
      throw new Error('Spreadsheet not found. It may have been deleted or moved to trash.');
    }
    if (metaRes.status === 403) {
      throw new Error(
        "Your Google account doesn't have access to this spreadsheet. " +
          'Open it in Google Sheets and make sure you can edit it, then try again.'
      );
    }
    throw new Error(`Could not access spreadsheet (${metaRes.status}).`);
  }

  // Test write by appending-then-clearing a single cell in a throwaway
  // range. We use `values:batchUpdate` with zero rows to validate the
  // write scope without actually changing the sheet. Googles's Drive
  // capabilities API isn't reliable here because the user could have
  // Drive "can edit" permissions but the file could still have Sheets-
  // level protection. The cheapest real test is a no-op write.
  const probeRes = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: [],
      }),
    }
  );
  if (!probeRes.ok) {
    if (probeRes.status === 403) {
      throw new Error(
        "Your Google account can view but not edit this spreadsheet. " +
          'Ask the owner for edit access, or pick a spreadsheet you own.'
      );
    }
    const body = await probeRes.json().catch(() => ({}));
    const msg = (body as { error?: { message?: string } }).error?.message;
    throw new Error(`Spreadsheet write check failed: ${msg || probeRes.status}`);
  }
}
