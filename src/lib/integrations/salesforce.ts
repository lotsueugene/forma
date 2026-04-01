/**
 * Salesforce integration - creates leads from form submissions
 */

import type { IntegrationPayload, IntegrationConfig } from './index';

export async function deliverToSalesforce(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  if (!config.accessToken || !config.instanceUrl) {
    throw new Error('Salesforce access token and instance URL are required');
  }

  // Map form fields to Salesforce Lead fields
  const leadData: Record<string, string> = {
    LeadSource: 'Web Form',
    Description: `Submitted via Forma form: ${payload.formName}`,
  };

  // Common field mappings
  const fieldMappings: Record<string, string[]> = {
    Email: ['email', 'email_address', 'emailaddress'],
    FirstName: ['first_name', 'firstname', 'fname'],
    LastName: ['last_name', 'lastname', 'lname', 'name'],
    Phone: ['phone', 'phone_number', 'phonenumber', 'telephone'],
    Company: ['company', 'company_name', 'organization', 'org'],
    Website: ['website', 'url', 'site'],
    Title: ['job_title', 'jobtitle', 'title', 'position', 'role'],
    City: ['city'],
    State: ['state', 'province'],
    Country: ['country'],
    PostalCode: ['postal_code', 'postalcode', 'zip', 'zipcode'],
  };

  // Auto-map common fields
  for (const [sfField, aliases] of Object.entries(fieldMappings)) {
    for (const alias of aliases) {
      const key = Object.keys(payload.data).find(
        (k) => k.toLowerCase().replace(/[^a-z]/g, '') === alias.replace(/[^a-z]/g, '')
      );
      if (key && payload.data[key]) {
        leadData[sfField] = String(payload.data[key]);
        break;
      }
    }
  }

  // Use custom field mapping if provided
  if (config.fieldMapping) {
    for (const [formField, sfField] of Object.entries(config.fieldMapping)) {
      if (payload.data[formField]) {
        leadData[sfField] = String(payload.data[formField]);
      }
    }
  }

  // LastName is required for Salesforce Leads - use email prefix if not found
  if (!leadData.LastName) {
    if (leadData.Email) {
      leadData.LastName = leadData.Email.split('@')[0];
    } else {
      leadData.LastName = 'Unknown';
    }
  }

  // Company is required - use a default if not found
  if (!leadData.Company) {
    leadData.Company = 'Not Provided';
  }

  const response = await fetch(
    `${config.instanceUrl}/services/data/v58.0/sobjects/Lead`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(leadData),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Salesforce API error (${response.status}): ${text}`);
  }
}
