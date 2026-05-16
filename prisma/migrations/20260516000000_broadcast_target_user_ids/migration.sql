-- Add user-specific targeting for admin broadcasts. JSON array of user IDs
-- (e.g. '["cm1...","cm2..."]'), nullable so existing rows stay valid. When
-- non-null and targetAll=false, the send loop limits to exactly these users
-- regardless of targetPlans.
ALTER TABLE "EmailBroadcast"
  ADD COLUMN "targetUserIds" TEXT;
