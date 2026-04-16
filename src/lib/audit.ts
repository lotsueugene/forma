/**
 * Audit logging for sensitive operations.
 * Logs to console in structured JSON format for log aggregator ingestion.
 */

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
  | string; // Allow custom actions

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

  // Structured JSON log — can be ingested by log aggregators
  console.log(JSON.stringify(entry));
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
}
