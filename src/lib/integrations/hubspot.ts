/**
 * HubSpot integration - creates contacts from form submissions
 */

import type { IntegrationPayload, IntegrationConfig } from './index';

export async function deliverToHubSpot(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  if (!config.apiKey) {
    throw new Error('HubSpot API key is required');
  }

  // Map form fields to HubSpot contact properties
  const properties: Record<string, string> = {};

  // Common field mappings
  const fieldMappings: Record<string, string[]> = {
    email: ['email', 'email_address', 'emailaddress'],
    firstname: ['first_name', 'firstname', 'fname', 'name'],
    lastname: ['last_name', 'lastname', 'lname'],
    phone: ['phone', 'phone_number', 'phonenumber', 'telephone'],
    company: ['company', 'company_name', 'organization', 'org'],
    website: ['website', 'url', 'site'],
    jobtitle: ['job_title', 'jobtitle', 'title', 'position', 'role'],
    message: ['message', 'comments', 'notes', 'description'],
  };

  // Auto-map common fields
  for (const [hubspotField, aliases] of Object.entries(fieldMappings)) {
    for (const alias of aliases) {
      const key = Object.keys(payload.data).find(
        (k) => k.toLowerCase().replace(/[^a-z]/g, '') === alias.replace(/[^a-z]/g, '')
      );
      if (key && payload.data[key]) {
        properties[hubspotField] = String(payload.data[key]);
        break;
      }
    }
  }

  // Use custom field mapping if provided
  if (config.fieldMapping) {
    for (const [formField, hubspotField] of Object.entries(config.fieldMapping)) {
      if (payload.data[formField]) {
        properties[hubspotField] = String(payload.data[formField]);
      }
    }
  }

  // Add source information
  properties.hs_lead_status = 'NEW';
  properties.lifecyclestage = 'lead';

  // Email is required for HubSpot contacts
  if (!properties.email) {
    throw new Error('Email field is required for HubSpot contact creation');
  }

  const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ properties }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');

    // Handle duplicate contact error - try to update instead
    if (response.status === 409) {
      // Contact exists, could implement update logic here
      console.log('HubSpot contact already exists, skipping creation');
      return;
    }

    throw new Error(`HubSpot API error (${response.status}): ${text}`);
  }
}
