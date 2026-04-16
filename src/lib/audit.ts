/**
 * Audit logging for sensitive operations.
 * Writes to both database (persistent, queryable) and console (immediate).
 */

import { prisma } from './prisma';

type AuditAction =
  | 'auth.login_success'
  | 'auth.login_failed'
  | 'auth.register'
  | 'auth.password_change'
  | 'auth.account_delete'
  | 'workspace.create'
  | 'workspace.delete'
  | 'workspace.transfer_ownership'
  | 'workspace.member_invite'
  | 'workspace.member_remove'
  | 'workspace.member_role_change'
  | 'workspace.leave'
  | 'form.create'
  | 'form.delete'
  | 'form.status_change'
  | 'subscription.upgrade'
  | 'subscription.downgrade'
  | 'subscription.trial_start'
  | 'admin.promote_user'
  | 'admin.demote_user'
  | 'admin.delete_user'
  | 'api_key.create'
  | 'api_key.delete'
  | 'security.rate_limit_hit'
  | 'security.invalid_signature'
  | 'security.webhook_replay'
  | string;

export function auditLog(event: {
  action: AuditAction;
  userId: string;
  ip?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'audit',
    ...event,
  };

  // Console log for immediate visibility
  console.log(JSON.stringify(entry));

  // Write to database (fire and forget — don't block the request)
  prisma.auditLog.create({
    data: {
      action: event.action,
      userId: event.userId,
      ip: event.ip,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      details: event.details ? JSON.stringify(event.details) : null,
    },
  }).catch((err) => {
    console.error('Failed to write audit log to database:', err);
  });
}

/**
 * Log a security event (failed auth, rate limits, suspicious activity)
 */
export function securityLog(event: {
  action: string;
  ip?: string;
  userId?: string;
  details?: Record<string, unknown>;
}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'security',
    ...event,
  };

  console.warn(JSON.stringify(entry));

  // Also persist security events to the audit log
  prisma.auditLog.create({
    data: {
      action: event.action,
      userId: event.userId,
      ip: event.ip,
      details: event.details ? JSON.stringify(event.details) : null,
    },
  }).catch((err) => {
    console.error('Failed to write security log to database:', err);
  });
}
