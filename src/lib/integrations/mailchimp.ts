/**
 * Mailchimp integration - adds subscribers to mailing lists
 */

import type { IntegrationPayload, IntegrationConfig } from './index';

export async function deliverToMailchimp(
  payload: IntegrationPayload,
  config: IntegrationConfig
): Promise<void> {
  if (!config.apiKey || !config.listId) {
    throw new Error('Mailchimp API key and list ID are required');
  }

  // Extract datacenter from API key (format: key-dc)
  const dc = config.apiKey.split('-').pop();
  if (!dc) {
    throw new Error('Invalid Mailchimp API key format');
  }

  // Find email field
  let email: string | undefined;
  const emailKeys = ['email', 'email_address', 'emailaddress'];
  for (const key of emailKeys) {
    const foundKey = Object.keys(payload.data).find(
      (k) => k.toLowerCase().replace(/[^a-z]/g, '') === key.replace(/[^a-z]/g, '')
    );
    if (foundKey && payload.data[foundKey]) {
      email = String(payload.data[foundKey]);
      break;
    }
  }

  if (!email) {
    throw new Error('Email field is required for Mailchimp subscription');
  }

  // Build merge fields from common fields
  const mergeFields: Record<string, string> = {};

  const fieldMappings: Record<string, string[]> = {
    FNAME: ['first_name', 'firstname', 'fname', 'name'],
    LNAME: ['last_name', 'lastname', 'lname'],
    PHONE: ['phone', 'phone_number', 'phonenumber'],
    COMPANY: ['company', 'company_name', 'organization'],
  };

  for (const [mergeField, aliases] of Object.entries(fieldMappings)) {
    for (const alias of aliases) {
      const key = Object.keys(payload.data).find(
        (k) => k.toLowerCase().replace(/[^a-z]/g, '') === alias.replace(/[^a-z]/g, '')
      );
      if (key && payload.data[key]) {
        mergeFields[mergeField] = String(payload.data[key]);
        break;
      }
    }
  }

  // Use custom field mapping if provided
  if (config.fieldMapping) {
    for (const [formField, mergeField] of Object.entries(config.fieldMapping)) {
      if (payload.data[formField]) {
        mergeFields[mergeField] = String(payload.data[formField]);
      }
    }
  }

  const subscriberData = {
    email_address: email,
    status: config.doubleOptIn ? 'pending' : 'subscribed',
    merge_fields: mergeFields,
    tags: config.tags ? config.tags.split(',').map((t: string) => t.trim()) : [],
  };

  const response = await fetch(
    `https://${dc}.api.mailchimp.com/3.0/lists/${config.listId}/members`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`anystring:${config.apiKey}`).toString('base64')}`,
      },
      body: JSON.stringify(subscriberData),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');

    // Handle "already subscribed" gracefully
    if (response.status === 400 && text.includes('Member Exists')) {
      console.log('Mailchimp subscriber already exists');
      return;
    }

    throw new Error(`Mailchimp API error (${response.status}): ${text}`);
  }
}
