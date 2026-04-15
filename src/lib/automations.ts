import { prisma } from './prisma';
import { sendEmail, isEmailConfigured } from './email';

interface AutomationAction {
  type: 'send_email';
  to: 'respondent' | 'custom';
  customEmail?: string;
  subject: string;
  body: string;
  delay: number; // minutes
}

/**
 * Process automations for a form submission
 */
export async function processAutomations({
  formId,
  submissionId,
  data,
  fields,
}: {
  formId: string;
  submissionId: string;
  data: Record<string, unknown>;
  fields: Array<{ id: string; label: string; type: string }>;
}) {
  if (!isEmailConfigured()) return;

  try {
    const automations = await prisma.automation.findMany({
      where: { formId, enabled: true },
    });

    if (automations.length === 0) return;

    // Find respondent email from submission data
    const emailField = fields.find(f => f.type === 'email');
    const respondentEmail = emailField ? String(data[emailField.id] || '') : '';

    for (const automation of automations) {
      const actions: AutomationAction[] = JSON.parse(automation.actions);

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (action.type !== 'send_email') continue;

        // Determine recipient
        const to = action.to === 'respondent' ? respondentEmail : (action.customEmail || '');
        if (!to) continue;

        // Replace template variables in subject and body
        const subject = replaceTemplateVars(action.subject, data, fields);
        const body = wrapInEmailTemplate(replaceTemplateVars(action.body, data, fields));

        if (action.delay === 0) {
          // Send immediately
          try {
            await sendEmail({ to, subject, html: body });
          } catch (err) {
            console.error(`Failed to send auto-reply for automation ${automation.id}:`, err);
          }
        } else {
          // Schedule for later
          const scheduledFor = new Date(Date.now() + action.delay * 60 * 1000);
          await prisma.scheduledEmail.create({
            data: {
              automationId: automation.id,
              submissionId,
              actionIndex: i,
              to,
              subject,
              body,
              scheduledFor,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('Error processing automations:', err);
  }
}

/**
 * Replace {{variable}} templates with actual submission data
 */
function replaceTemplateVars(
  template: string,
  data: Record<string, unknown>,
  fields: Array<{ id: string; label: string; type: string }>
): string {
  let result = template;

  for (const field of fields) {
    const value = data[field.id];
    if (value === undefined || value === null) continue;

    const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const varName = field.label.toLowerCase().replace(/\s+/g, '_');

    // Replace both {{var_name}} and {{field_id}}
    result = result.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'gi'), displayValue);
    result = result.replace(new RegExp(`\\{\\{${field.id}\\}\\}`, 'gi'), displayValue);
  }

  return result;
}

/**
 * Wrap plain text body in a simple HTML email template
 */
function wrapInEmailTemplate(body: string): string {
  // If body already contains HTML tags, use as-is
  if (body.includes('<') && body.includes('>')) {
    return body;
  }

  // Convert plain text to HTML (newlines to <br>, links to <a>)
  const htmlBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#ef6f2e">$1</a>');

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1f2937">
      ${htmlBody}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
        Sent via <a href="https://withforma.io" style="color:#ef6f2e;text-decoration:none">Forma</a>
      </div>
    </div>
  `;
}
