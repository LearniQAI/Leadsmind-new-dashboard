-- Speeds up the validateApiKey() hashed lookup + active-webhook fan-out.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_api_keys') THEN
        CREATE INDEX IF NOT EXISTS idx_workspace_api_keys_key_hash
          ON public.workspace_api_keys (key_hash) WHERE revoked = false;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_webhooks') THEN
        CREATE INDEX IF NOT EXISTS idx_workspace_webhooks_ws_active
          ON public.workspace_webhooks (workspace_id) WHERE active = true;
    END IF;
END $$;