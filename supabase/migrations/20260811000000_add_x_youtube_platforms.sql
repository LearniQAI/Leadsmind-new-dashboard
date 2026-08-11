
-- Add 'x' and 'youtube' to platform constraints (Task 75 foundation work — precedes
-- building the actual X/YouTube publish integrations). Uses 'x', not 'twitter': the
-- 'twitter' value was explicitly retired in 20240101000153_replace_twitter_with_linkedin.sql,
-- and BrandIcons.tsx's `Twitter` export is documented as rendering "the current X (formerly
-- Twitter) mark" — the product already treats X as the current name for this platform.
ALTER TABLE platform_connections DROP CONSTRAINT IF EXISTS platform_connections_platform_check;
ALTER TABLE platform_connections ADD CONSTRAINT platform_connections_platform_check
    CHECK (platform IN ('email', 'sms', 'whatsapp', 'instagram', 'linkedin', 'facebook', 'tiktok', 'x', 'youtube'));

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_platform_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_platform_check
    CHECK (platform IN ('email', 'sms', 'whatsapp', 'instagram', 'linkedin', 'facebook', 'tiktok', 'x', 'youtube'));
