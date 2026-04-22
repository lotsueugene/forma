-- Track the last delivery attempt per Integration so the UI can show a
-- "Last: HTTP 200 · 2m ago" strip without a separate delivery log table.
-- Fields are all nullable so existing rows remain valid.
ALTER TABLE "Integration"
  ADD COLUMN "lastRunAt" TIMESTAMP(3),
  ADD COLUMN "lastStatus" TEXT,
  ADD COLUMN "lastStatusCode" INTEGER,
  ADD COLUMN "lastError" TEXT;
