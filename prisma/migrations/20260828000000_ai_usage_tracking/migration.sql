-- Persistent AI usage telemetry for admin review and quota enforcement.
-- Prompt content is not stored; promptHash supports abuse correlation without
-- retaining user-entered form descriptions.

CREATE TABLE "AiUsageLog" (
  "id"                  TEXT NOT NULL,
  "userId"              TEXT NOT NULL,
  "workspaceId"         TEXT,
  "action"              TEXT NOT NULL DEFAULT 'form.generate',
  "provider"            TEXT NOT NULL DEFAULT 'bedrock',
  "modelId"             TEXT NOT NULL,
  "status"              TEXT NOT NULL,
  "promptHash"          TEXT,
  "promptChars"         INTEGER NOT NULL DEFAULT 0,
  "inputTokens"         INTEGER,
  "outputTokens"        INTEGER,
  "totalTokens"         INTEGER,
  "generatedFieldCount" INTEGER,
  "latencyMs"           INTEGER,
  "ip"                  TEXT,
  "userAgent"           TEXT,
  "errorCode"           TEXT,
  "errorMessage"        TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiUsageLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AiUsageLog_userId_createdAt_idx" ON "AiUsageLog"("userId", "createdAt");
CREATE INDEX "AiUsageLog_workspaceId_createdAt_idx" ON "AiUsageLog"("workspaceId", "createdAt");
CREATE INDEX "AiUsageLog_status_createdAt_idx" ON "AiUsageLog"("status", "createdAt");
CREATE INDEX "AiUsageLog_provider_modelId_createdAt_idx" ON "AiUsageLog"("provider", "modelId", "createdAt");
CREATE INDEX "AiUsageLog_ip_createdAt_idx" ON "AiUsageLog"("ip", "createdAt");
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");
