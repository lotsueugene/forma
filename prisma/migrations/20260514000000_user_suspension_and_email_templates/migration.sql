-- Add user suspension fields. Nullable so existing rows stay valid; a null
-- suspendedAt means the account is active. Indexed for fast filtering of
-- suspended users in the admin list.
ALTER TABLE "User"
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedReason" TEXT;

CREATE INDEX "User_suspendedAt_idx" ON "User"("suspendedAt");

-- Admin-editable email templates keyed by slug. Code-defined fallbacks live
-- in src/lib/email.ts so a missing row never breaks an outbound send.
CREATE TABLE "EmailTemplate" (
  "id"        TEXT NOT NULL,
  "slug"      TEXT NOT NULL,
  "subject"   TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailTemplate_slug_key" ON "EmailTemplate"("slug");
