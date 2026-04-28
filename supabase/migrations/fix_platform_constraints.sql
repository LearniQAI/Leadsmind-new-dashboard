
-- Fix check constraints to include 'facebook' and ensure 'whatsapp' is correctly handled
ALTER TABLE platform_connections DROP CONSTRAINT IF EXISTS platform_connections_platform_check;
ALTER TABLE platform_connections ADD CONSTRAINT platform_connections_platform_check 
    CHECK (platform IN ('email', 'sms', 'whatsapp', 'instagram', 'twitter', 'facebook'));

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_platform_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_platform_check 
    CHECK (platform IN ('email', 'sms', 'whatsapp', 'instagram', 'twitter', 'facebook'));
