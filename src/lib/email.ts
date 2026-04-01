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
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; font-weight: 500; color: #1f2937;">${escapeHtml(key)}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; color: #6b7280;">${escapeHtml(displayValue)}</td>
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f5f5f4;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
      <!-- Header with Forma Logo -->
      <div style="padding: 24px 32px; border-bottom: 1px solid #e5e5e5;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width: 32px; height: 32px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 8px;"></td>
            <td style="padding-left: 12px; font-size: 20px; font-weight: 700; color: #1f2937;">Forma</td>
          </tr>
        </table>
      </div>

      <!-- Title -->
      <div style="padding: 32px 32px 0;">
        <h1 style="margin: 0 0 8px; color: #1f2937; font-size: 24px; font-weight: 600;">
          New Form Submission
        </h1>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          ${escapeHtml(formName)}${workspaceName ? ` · ${escapeHtml(workspaceName)}` : ''}
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

        <table style="width: 100%; border-collapse: collapse; background: #fafaf9; border-radius: 8px; overflow: hidden; border: 1px solid #e5e5e5;">
          <tbody>
            ${dataRows}
          </tbody>
        </table>

        <div style="margin-top: 32px; text-align: center;">
          <a href="${process.env.NEXTAUTH_URL || 'https://withforma.io'}/dashboard/forms/${formId}"
             style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            View in Dashboard
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 24px 32px; background: #fafaf9; border-top: 1px solid #e5e5e5;">
        <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
          Submission ID: ${submissionId}<br>
          <a href="https://withforma.io" style="color: #f97316; text-decoration: none;">Forma</a> — The modern way to build forms
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f5f5f4;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
      <!-- Header with Forma Logo -->
      <div style="padding: 24px 32px; border-bottom: 1px solid #e5e5e5;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width: 32px; height: 32px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 8px;"></td>
            <td style="padding-left: 12px; font-size: 20px; font-weight: 700; color: #1f2937;">Forma</td>
          </tr>
        </table>
      </div>

      <!-- Title -->
      <div style="padding: 32px 32px 0;">
        <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: 600;">
          You're Invited to Join a Workspace
        </h1>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        <p style="margin: 0 0 24px; font-size: 16px; color: #374151;">
          <strong style="color: #1f2937;">${escapeHtml(invitedByName)}</strong> has invited you to join <strong style="color: #1f2937;">${escapeHtml(workspaceName)}</strong> on Forma.
        </p>

        <div style="background: #fafaf9; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e5e5e5;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <span style="color: #9ca3af;">Role:</span> <span style="color: #1f2937; font-weight: 500;">${escapeHtml(roleDisplay)}</span><br>
            <span style="color: #9ca3af;">Workspace:</span> <span style="color: #1f2937; font-weight: 500;">${escapeHtml(workspaceName)}</span>
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${acceptUrl}"
             style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </div>

        <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px; text-align: center;">
          This invitation expires on ${expiresFormatted}.<br>
          If you didn't expect this invitation, you can ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 24px 32px; background: #fafaf9; border-top: 1px solid #e5e5e5;">
        <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
          <a href="https://withforma.io" style="color: #f97316; text-decoration: none;">Forma</a> — The modern way to build forms
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
