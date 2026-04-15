/**
 * Audit logging for sensitive operations.
 * Logs to console in structured format. Can be extended to external service.
 */
export function auditLog(event: {
  action: string;
  userId: string;
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
