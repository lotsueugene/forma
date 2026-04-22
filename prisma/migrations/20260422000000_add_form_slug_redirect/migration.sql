-- Keep old slugs / bookingSlugs resolvable for a grace period after a rename
-- so external links keep working. The custom-domain resolver falls back to
-- this table and returns a 301 to the form's current URL.
CREATE TABLE "FormSlugRedirect" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FormSlugRedirect_workspaceId_slug_key" ON "FormSlugRedirect"("workspaceId", "slug");
CREATE INDEX "FormSlugRedirect_formId_idx" ON "FormSlugRedirect"("formId");
CREATE INDEX "FormSlugRedirect_expiresAt_idx" ON "FormSlugRedirect"("expiresAt");

ALTER TABLE "FormSlugRedirect"
    ADD CONSTRAINT "FormSlugRedirect_formId_fkey"
    FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
