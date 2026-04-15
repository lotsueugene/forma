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
          // Send immediately and log it
          let status = 'sent';
          try {
            await sendEmail({ to, subject, html: body });
          } catch (err) {
            console.error(`Failed to send auto-reply for automation ${automation.id}:`, err);
            status = 'failed';
          }
          await prisma.scheduledEmail.create({
            data: {
              automationId: automation.id,
              submissionId,
              actionIndex: i,
              to,
              subject,
              body,
              scheduledFor: new Date(),
              sentAt: status === 'sent' ? new Date() : null,
              status,
            },
          });
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

    let displayValue: string;
    if (field.type === 'booking') {
      // Format booking as readable text — value can be string or object
      let parsed: { date?: string; slots?: Array<{ start: string; end: string }> } | null = null;
      if (typeof value === 'string') {
        try { parsed = JSON.parse(value); } catch { parsed = null; }
      } else if (typeof value === 'object') {
        parsed = value as { date?: string; slots?: Array<{ start: string; end: string }> };
      }
      if (parsed?.date && Array.isArray(parsed.slots)) {
        const dateStr = new Date(parsed.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const fmt = (t: string) => { const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${ap}`; };
        const slotsStr = parsed.slots.map(s => `${fmt(s.start)} - ${fmt(s.end)}`).join(', ');
        displayValue = `${dateStr} · ${slotsStr}`;
      } else {
        displayValue = String(value);
      }
    } else if (typeof value === 'object') {
      displayValue = JSON.stringify(value);
    } else {
      displayValue = String(value);
    }
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
  // If body already contains HTML tags, wrap in base template
  if (body.includes('<') && body.includes('>')) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1f2937;margin:0;padding:0;background-color:#ffffff;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    ${body}
    <div style="padding:24px 0 0;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
      Sent via <a href="https://withforma.io" style="color:#ef6f2e;text-decoration:none"><img src="https://withforma.io/icon.svg" alt="Forma" width="14" height="14" style="display:inline-block;vertical-align:middle;margin-right:3px;" />Forma</a>
    </div>
  </div>
</body>
</html>`;
  }

  // Convert plain text to HTML (newlines to <br>, links to <a>)
  const htmlBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#ef6f2e">$1</a>');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1f2937;margin:0;padding:0;background-color:#ffffff;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="color:#374151;font-size:15px;line-height:1.7;">
      ${htmlBody}
    </div>
    <div style="padding:24px 0 0;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
      Sent via <a href="https://withforma.io" style="color:#ef6f2e;text-decoration:none"><img src="https://withforma.io/icon.svg" alt="Forma" width="14" height="14" style="display:inline-block;vertical-align:middle;margin-right:3px;" />Forma</a>
    </div>
  </div>
</body>
</html>`;
}
