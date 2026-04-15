import { z } from 'zod';

/** Form field schema */
export const fieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    'text', 'email', 'phone', 'textarea', 'number', 'date',
    'checkbox', 'radio', 'select', 'file', 'rating', 'url',
    'page_break', 'hidden', 'image', 'video', 'payment', 'booking',
  ]),
  label: z.string().max(200),
  placeholder: z.string().max(500).optional(),
  required: z.boolean(),
  options: z.array(z.string().max(200)).optional(),
  defaultValue: z.string().max(1000).optional(),
  mediaUrl: z.string().url().optional().or(z.literal('')),
  amount: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  bookingMode: z.enum(['custom', 'fixed']).optional(),
  slotDuration: z.number().min(5).max(480).optional(),
  availabilityEnabled: z.boolean().optional(),
  weeklySchedule: z.record(z.string(), z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }))).optional(),
}).passthrough(); // Allow additional fields for forward compat

/** Form creation/update schema */
export const formSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  fields: z.array(fieldSchema).optional(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
  status: z.enum(['draft', 'active', 'archived', 'paused']).optional(),
  slug: z.string().max(100).regex(/^[a-z0-9-]*$/).optional().nullable(),
});

/** Automation action schema */
export const automationActionSchema = z.object({
  type: z.enum(['send_email']),
  to: z.enum(['respondent', 'custom']),
  customEmail: z.string().email().optional(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  delay: z.number().min(0).max(43200), // max 30 days
});

/** Automation creation schema */
export const automationSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: z.enum(['submission']).default('submission'),
  actions: z.array(automationActionSchema).min(1).max(20),
  conditions: z.record(z.string(), z.unknown()).optional().nullable(),
  enabled: z.boolean().optional(),
});

/** Webhook endpoint schema */
export const webhookSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  events: z.string().max(500).optional(),
});

/**
 * Validate request body with Zod schema.
 * Returns parsed data or null (with error response).
 */
export function validateBody<T>(
  data: unknown,
  schema: z.ZodType<T>
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      data: null,
      error: `${firstError.path.join('.')}: ${firstError.message}`,
    };
  }
  return { data: result.data, error: null };
}
