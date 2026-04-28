
-- Update platform check constraints to replace 'twitter' with 'linkedin'
ALTER TABLE platform_connections DROP CONSTRAINT IF EXISTS platform_connections_platform_check;
ALTER TABLE platform_connections ADD CONSTRAINT platform_connections_platform_check 
    CHECK (platform IN ('email', 'sms', 'whatsapp', 'instagram', 'linkedin', 'facebook'));

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_platform_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_platform_check 
    CHECK (platform IN ('email', 'sms', 'whatsapp', 'instagram', 'linkedin', 'facebook'));

-- If any existing twitter connections exist, migrate them to linkedin (optional, but good for completeness)
UPDATE platform_connections SET platform = 'linkedin' WHERE platform = 'twitter';
UPDATE conversations SET platform = 'linkedin' WHERE platform = 'twitter';
