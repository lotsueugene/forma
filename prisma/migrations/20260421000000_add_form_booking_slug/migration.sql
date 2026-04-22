-- Add bookingSlug column to Form for a separate slug that serves the
-- dedicated booking UI on custom domains (e.g. forms.example.com/bookings).
ALTER TABLE "Form" ADD COLUMN "bookingSlug" TEXT;

-- Ensure bookingSlug is unique within a workspace (same rule as slug).
CREATE UNIQUE INDEX "Form_workspaceId_bookingSlug_key" ON "Form"("workspaceId", "bookingSlug");
