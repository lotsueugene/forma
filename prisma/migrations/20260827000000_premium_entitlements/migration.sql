-- Premium entitlement system. Entitlements are user-scoped and timestamp
-- based; authorization must check startsAt/expiresAt/revokedAt rather than
-- trusting the reporting-oriented status column alone.

CREATE TABLE "Entitlement" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "type"           TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'active',
  "startsAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"      TIMESTAMP(3),
  "grantedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "grantedBy"      TEXT,
  "grantReason"    TEXT NOT NULL,
  "source"         TEXT NOT NULL DEFAULT 'admin',
  "metadata"       TEXT,
  "idempotencyKey" TEXT,
  "revokedAt"      TIMESTAMP(3),
  "revokedBy"      TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "EntitlementAuditLog" (
  "id"            TEXT NOT NULL,
  "entitlementId" TEXT,
  "userId"        TEXT NOT NULL,
  "action"        TEXT NOT NULL,
  "actorId"       TEXT,
  "source"        TEXT NOT NULL,
  "reason"        TEXT,
  "previousValue" TEXT,
  "newValue"      TEXT,
  "metadata"      TEXT,
  "idempotencyKey" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EntitlementAuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EntitlementAuditLog_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "Entitlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "EntitlementEvent" (
  "id"             TEXT NOT NULL,
  "entitlementId"  TEXT,
  "userId"         TEXT NOT NULL,
  "type"           TEXT NOT NULL,
  "payload"        TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "attempts"       INTEGER NOT NULL DEFAULT 0,
  "processedAt"    TIMESTAMP(3),
  "lastError"      TEXT,
  "idempotencyKey" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EntitlementEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EntitlementEvent_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "Entitlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "Notification"
  ADD COLUMN "entitlementId" TEXT,
  ADD COLUMN "dedupeKey" TEXT,
  ADD COLUMN "displayedAt" TIMESTAMP(3);

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "Entitlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Entitlement_idempotencyKey_key" ON "Entitlement"("idempotencyKey");
CREATE INDEX "Entitlement_userId_type_startsAt_idx" ON "Entitlement"("userId", "type", "startsAt");
CREATE INDEX "Entitlement_userId_type_revokedAt_idx" ON "Entitlement"("userId", "type", "revokedAt");
CREATE INDEX "Entitlement_status_idx" ON "Entitlement"("status");
CREATE INDEX "Entitlement_expiresAt_idx" ON "Entitlement"("expiresAt");
CREATE INDEX "Entitlement_grantedBy_idx" ON "Entitlement"("grantedBy");

CREATE INDEX "EntitlementAuditLog_entitlementId_idx" ON "EntitlementAuditLog"("entitlementId");
CREATE INDEX "EntitlementAuditLog_userId_createdAt_idx" ON "EntitlementAuditLog"("userId", "createdAt");
CREATE INDEX "EntitlementAuditLog_actorId_idx" ON "EntitlementAuditLog"("actorId");
CREATE INDEX "EntitlementAuditLog_action_idx" ON "EntitlementAuditLog"("action");
CREATE UNIQUE INDEX "EntitlementAuditLog_idempotencyKey_key" ON "EntitlementAuditLog"("idempotencyKey");

CREATE UNIQUE INDEX "EntitlementEvent_idempotencyKey_key" ON "EntitlementEvent"("idempotencyKey");
CREATE INDEX "EntitlementEvent_userId_createdAt_idx" ON "EntitlementEvent"("userId", "createdAt");
CREATE INDEX "EntitlementEvent_type_status_idx" ON "EntitlementEvent"("type", "status");
CREATE INDEX "EntitlementEvent_entitlementId_idx" ON "EntitlementEvent"("entitlementId");

CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "Notification_userId_type_displayedAt_idx" ON "Notification"("userId", "type", "displayedAt");
CREATE INDEX "Notification_entitlementId_idx" ON "Notification"("entitlementId");
