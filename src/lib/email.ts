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

const EMAIL_FROM = process.env.EMAIL_FROM || 'Forma <notifications@forma.app>';

export interface SubmissionEmailData {
  formName: string;
  formId: string;
  submissionId: string;
  submittedAt: string;
  data: Record<string, unknown>;
  workspaceName?: string;
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
  const { formName, formId, submissionId, submittedAt, data, workspaceName } = submission;

  // Format submission data as HTML table
  const dataRows = Object.entries(data)
    .map(([key, value]) => {
      const displayValue = typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : String(value);
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500; color: #374151;">${escapeHtml(key)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${escapeHtml(displayValue)}</td>
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 24px 32px;">
        <h1 style="margin: 0; color: white; font-size: 20px; font-weight: 600;">
          New Form Submission
        </h1>
        <p style="margin: 8px 0 0; color: #9ca3af; font-size: 14px;">
          ${escapeHtml(formName)}${workspaceName ? ` • ${escapeHtml(workspaceName)}` : ''}
        </p>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
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

        <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 6px; overflow: hidden;">
          <tbody>
            ${dataRows}
          </tbody>
        </table>

        <div style="margin-top: 32px; text-align: center;">
          <a href="${process.env.NEXTAUTH_URL || 'https://forma.app'}/dashboard/forms/${formId}"
             style="display: inline-block; padding: 12px 24px; background: #1f2937; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
            View in Dashboard
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
          Submission ID: ${submissionId}<br>
          Sent by <a href="https://forma.app" style="color: #6b7280;">Forma</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Plain text version
  const text = `
New Form Submission - ${formName}

Received: ${submittedAt}

${Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n')}

View in Dashboard: ${process.env.NEXTAUTH_URL || 'https://forma.app'}/dashboard/forms/${formId}

---
Submission ID: ${submissionId}
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 24px 32px;">
        <h1 style="margin: 0; color: white; font-size: 20px; font-weight: 600;">
          You're Invited to Join a Workspace
        </h1>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; font-size: 16px;">
          <strong>${escapeHtml(invitedByName)}</strong> has invited you to join <strong>${escapeHtml(workspaceName)}</strong> on Forma.
        </p>

        <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Role:</strong> ${escapeHtml(roleDisplay)}<br>
            <strong>Workspace:</strong> ${escapeHtml(workspaceName)}
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${acceptUrl}"
             style="display: inline-block; padding: 14px 32px; background: #1f2937; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
            Accept Invitation
          </a>
        </div>

        <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
          This invitation expires on ${expiresFormatted}.<br>
          If you didn't expect this invitation, you can ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
          Sent by <a href="https://withforma.io" style="color: #6b7280;">Forma</a> — The developer-first form builder
        </p>
      </div>
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
Sent by Forma — The developer-first form builder
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
