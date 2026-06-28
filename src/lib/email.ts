/**
 * Email notifications using Resend
 * https://resend.com/docs
 */

import { Resend } from 'resend';

// Resend is initialized lazily to avoid errors when API key is not set
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

const EMAIL_FROM = process.env.EMAIL_FROM || 'Forma <notifications@withforma.io>';

/**
 * Send a generic email via Resend with retry on rate limit
 */
export async function sendEmail({ to, subject, html, from }: { to: string; subject: string; html: string; from?: string }) {
  const resend = getResend();
  if (!resend) throw new Error('Email not configured');

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await resend.emails.send({
        from: from || EMAIL_FROM,
        to,
        subject,
        html,
      });
      return;
    } catch (err: unknown) {
      const isRateLimit = err instanceof Error && (err.message?.includes('rate limit') || err.message?.includes('429'));
      if (isRateLimit && attempt < 2) {
        await new Promise(r => setTimeout(r, 1500));
      } else {
        throw err;
      }
    }
  }
}

export interface FormField {
  id: string;
  label: string;
  type: string;
}

export interface SubmissionEmailData {
  formName: string;
  formId: string;
  submissionId: string;
  submittedAt: string;
  data: Record<string, unknown>;
  workspaceName?: string;
  fields?: FormField[];
}

/**
 * Send email notification for a new form submission
 */
export async function sendSubmissionNotification(
  to: string | string[],
  submission: SubmissionEmailData
): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();

  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not set - emails disabled');
    return { success: false, error: 'Email not configured' };
  }

  console.log(`[Email] Preparing submission notification for form ${submission.formName}`);
  const { formName, formId, submissionId, submittedAt, data, workspaceName, fields } = submission;

  // Create a map of field IDs to labels
  const fieldLabels = new Map<string, string>();
  if (fields) {
    fields.forEach(field => {
      fieldLabels.set(field.id, field.label);
    });
  }

  // Format submission data as HTML table
  const dataRows = Object.entries(data)
    .map(([key, value]) => {
      // Use field label if available, otherwise use the key
      const displayKey = fieldLabels.get(key) || key;

      // Check if value is a file upload (object or JSON string)
      let displayValue: string;
      let parsed = value;
      if (typeof parsed === 'string') {
        try { const p = JSON.parse(parsed); if (p && typeof p === 'object') parsed = p; } catch {}
      }
      if (parsed && typeof parsed === 'object' && 'url' in (parsed as Record<string, unknown>)) {
        const file = parsed as { name?: string; url?: string; size?: number; type?: string };
        const fileName = file.name || 'Download file';
        const fileSize = file.size ? ` (${(file.size / 1024 / 1024).toFixed(1)} MB)` : '';
        displayValue = `<a href="${escapeHtml(file.url || '')}" style="color: #ef6f2e; text-decoration: none; font-weight: 500;">${escapeHtml(fileName)}</a><span style="color: #9ca3af;">${fileSize}</span>`;
      } else if (parsed && typeof parsed === 'object' && 'date' in (parsed as Record<string, unknown>) && 'slots' in (parsed as Record<string, unknown>)) {
        const booking = parsed as { date: string; slots: Array<{ start: string; end: string }> };
        // Always include the year — bookings can be 12+ months out and the
        // email recipient has no other anchor for when the booking is.
        const dateStr = new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const fmt = (t: string) => { const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${ap}`; };
        const slotsStr = booking.slots.map(s => `${fmt(s.start)} – ${fmt(s.end)}`).join(', ');
        displayValue = `<strong>${escapeHtml(dateStr)}</strong> · ${escapeHtml(slotsStr)}`;
      } else if (parsed && typeof parsed === 'object') {
        displayValue = escapeHtml(JSON.stringify(parsed, null, 2));
      } else {
        displayValue = escapeHtml(String(value ?? ''));
      }

      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; font-weight: 500; color: #1f2937;">${escapeHtml(displayKey)}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; color: #6b7280;">${displayValue}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header with Forma Logo -->
    <div style="padding: 0 0 24px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width: 32px; height: 32px;">
            <img src="https://withforma.io/icon.svg" alt="Forma" width="32" height="32" style="display: block;" />
          </td>
          <td style="padding-left: 12px; font-size: 20px; font-weight: 700; color: #1f2937;">Forma</td>
        </tr>
      </table>
    </div>

    <!-- Title -->
    <div style="padding: 0 0 24px;">
      <h1 style="margin: 0 0 8px; color: #1f2937; font-size: 24px; font-weight: 600;">
        New Form Submission
      </h1>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        ${escapeHtml(formName)}${workspaceName ? ` · ${escapeHtml(workspaceName)}` : ''}
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 0 0 32px;">
      <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px;">
        Received on ${new Date(submittedAt).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>

      <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #e5e5e5;">
        <tbody>
          ${dataRows}
        </tbody>
      </table>

      <div style="margin-top: 32px; text-align: center;">
        <a href="${process.env.NEXTAUTH_URL || 'https://withforma.io'}/dashboard/forms/${formId}"
           style="display: inline-block; padding: 12px 28px; background: #ef6f2e; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View in Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 0 0; border-top: 1px solid #e5e5e5;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
        Submission ID: ${submissionId}<br>
        <a href="https://withforma.io" style="color: #ef6f2e; text-decoration: none;">Forma</a> — The modern way to build forms
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Plain text version
  const text = `
New Form Submission - ${formName}

Received: ${submittedAt}

${Object.entries(data).map(([k, v]) => `${fieldLabels.get(k) || k}: ${v}`).join('\n')}

View in Dashboard: ${process.env.NEXTAUTH_URL || 'https://withforma.io'}/dashboard/forms/${formId}

---
Submission ID: ${submissionId}
Sent by Forma — The modern way to build forms
https://withforma.io
  `.trim();

  try {
    console.log(`[Email] Sending submission notification to ${Array.isArray(to) ? to.join(', ') : to}`);
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `New submission: ${formName}`,
      html,
      text,
    });
    console.log(`[Email] Sent successfully:`, result);
    return { success: true };
  } catch (error) {
    console.error('[Email] Failed to send submission notification:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Check if email notifications are configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export interface InvitationEmailData {
  token: string;
  email: string;
  role: string;
  workspaceName: string;
  invitedByName: string;
  expiresAt: Date;
}

/**
 * Send workspace invitation email
 */
export async function sendInvitationEmail(
  data: InvitationEmailData
): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();

  if (!resend) {
    console.warn('Email notifications disabled: RESEND_API_KEY not set');
    return { success: false, error: 'Email not configured' };
  }

  const { token, email, role, workspaceName, invitedByName, expiresAt } = data;
  const baseUrl = process.env.NEXTAUTH_URL || 'https://withforma.io';
  const acceptUrl = `${baseUrl}/invite/${token}`;

  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header with Forma Logo -->
    <div style="padding: 0 0 24px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width: 32px; height: 32px;">
            <img src="https://withforma.io/icon.svg" alt="Forma" width="32" height="32" style="display: block;" />
          </td>
          <td style="padding-left: 12px; font-size: 20px; font-weight: 700; color: #1f2937;">Forma</td>
        </tr>
      </table>
    </div>

    <!-- Title -->
    <div style="padding: 0 0 24px;">
      <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: 600;">
        You're Invited to Join a Workspace
      </h1>
    </div>

    <!-- Content -->
    <div style="padding: 0 0 32px;">
      <p style="margin: 0 0 24px; font-size: 16px; color: #374151;">
        <strong style="color: #1f2937;">${escapeHtml(invitedByName)}</strong> has invited you to join <strong style="color: #1f2937;">${escapeHtml(workspaceName)}</strong> on Forma.
      </p>

      <div style="border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e5e5e5;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          <span style="color: #9ca3af;">Role:</span> <span style="color: #1f2937; font-weight: 500;">${escapeHtml(roleDisplay)}</span><br>
          <span style="color: #9ca3af;">Workspace:</span> <span style="color: #1f2937; font-weight: 500;">${escapeHtml(workspaceName)}</span>
        </p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${acceptUrl}"
           style="display: inline-block; padding: 14px 36px; background: #ef6f2e; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>
      </div>

      <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px; text-align: center;">
        This invitation expires on ${expiresFormatted}.<br>
        If you didn't expect this invitation, you can ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 0 0; border-top: 1px solid #e5e5e5;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
        <a href="https://withforma.io" style="color: #ef6f2e; text-decoration: none;">Forma</a> — The modern way to build forms
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
You're Invited to Join a Workspace

${invitedByName} has invited you to join ${workspaceName} on Forma.

Role: ${roleDisplay}
Workspace: ${workspaceName}

Accept the invitation: ${acceptUrl}

This invitation expires on ${expiresFormatted}.

---
Sent by Forma — The modern way to build forms
https://withforma.io
  `.trim();

  try {
    console.log(`[Email] Sending invitation to ${email} for workspace ${workspaceName}`);
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `${invitedByName} invited you to join ${workspaceName} on Forma`,
      html,
      text,
    });
    console.log(`[Email] Invitation sent successfully:`, result);
    return { success: true };
  } catch (error) {
    console.error('[Email] Failed to send invitation:', error);
    return { success: false, error: String(error) };
  }
}

// ----- Welcome email -------------------------------------------------------
// Sent once on signup. Subject + body are admin-editable via EmailTemplate
// (slug = 'welcome'); if no row exists the code-defined defaults below kick in
// so a fresh install still sends something sensible.

export interface WelcomeEmailData {
  to: string;
  name?: string | null;
}

const WELCOME_DEFAULT_SUBJECT = 'Welcome to Forma';
// Body uses {{name}} / {{email}} placeholders that are substituted at send
// time. Keep the markup minimal — same shape as the invitation email.
const WELCOME_DEFAULT_BODY = `
<p>Hi {{name}},</p>
<p>Thanks for signing up for Forma. Your account is ready and your personal workspace is set up — you can build your first form whenever you're ready.</p>
<p>A few things you can do next:</p>
<ul>
  <li>Create a form from scratch or start from a template</li>
  <li>Wire submissions into Slack, Notion, or any webhook</li>
  <li>Invite a teammate to your workspace</li>
</ul>
<p>If you didn't sign up for this account, please ignore this email or reply to let us know.</p>
`.trim();

function substitutePlaceholders(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value !== undefined ? escapeHtml(value) : '';
  });
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Send the post-signup welcome email. Pulls subject + body from the
 * `EmailTemplate` table (slug='welcome') when present, falls back to the
 * code-defined defaults otherwise. Fails open — a missing API key or
 * Resend hiccup never blocks signup.
 */
export async function sendWelcomeEmail(
  data: WelcomeEmailData
): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not set — skipping welcome email');
    return { success: false, error: 'Email not configured' };
  }

  const { to, name } = data;
  const baseUrl = process.env.NEXTAUTH_URL || 'https://withforma.io';
  const displayName = name?.trim() || to.split('@')[0] || 'there';

  // Pull admin-editable template if it exists. Lazy-import prisma to avoid
  // forcing this module's importers to also drag in the prisma client when
  // they don't need it (the file is shared across server contexts).
  let subject = WELCOME_DEFAULT_SUBJECT;
  let body = WELCOME_DEFAULT_BODY;
  try {
    const { prisma } = await import('./prisma');
    const tpl = await prisma.emailTemplate.findUnique({
      where: { slug: 'welcome' },
      select: { subject: true, body: true },
    });
    if (tpl) {
      subject = tpl.subject;
      body = tpl.body;
    }
  } catch (err) {
    console.warn('[Email] Could not load welcome template from DB, using defaults', err);
  }

  const renderedBody = substitutePlaceholders(body, {
    name: displayName,
    email: to,
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="padding: 0 0 24px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width: 32px; height: 32px;">
            <img src="${baseUrl}/icon.svg" alt="Forma" width="32" height="32" style="display: block;" />
          </td>
          <td style="padding-left: 12px; font-size: 20px; font-weight: 700; color: #1f2937;">Forma</td>
        </tr>
      </table>
    </div>

    <div style="padding: 0 0 32px; font-size: 15px; color: #374151;">
      ${renderedBody}

      <div style="text-align: center; margin: 32px 0 0;">
        <a href="${baseUrl}/dashboard"
           style="display: inline-block; padding: 14px 36px; background: #ef6f2e; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
          Open your dashboard
        </a>
      </div>
    </div>

    <div style="padding: 24px 0 0; border-top: 1px solid #e5e5e5;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
        <a href="${baseUrl}" style="color: #ef6f2e; text-decoration: none;">Forma</a> — The modern way to build forms
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = htmlToPlainText(renderedBody) + `\n\nOpen your dashboard: ${baseUrl}/dashboard\n`;

  try {
    console.log(`[Email] Sending welcome email to ${to}`);
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    console.log(`[Email] Welcome email sent:`, result);
    return { success: true };
  } catch (error) {
    console.error('[Email] Failed to send welcome email:', error);
    return { success: false, error: String(error) };
  }
}

export const WELCOME_EMAIL_DEFAULTS = {
  subject: WELCOME_DEFAULT_SUBJECT,
  body: WELCOME_DEFAULT_BODY,
};
