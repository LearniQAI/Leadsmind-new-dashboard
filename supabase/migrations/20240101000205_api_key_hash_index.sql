-- Speeds up the validateApiKey() hashed lookup + active-webhook fan-out.
create index if not exists idx_workspace_api_keys_key_hash
  on public.workspace_api_keys (key_hash) where revoked = false;

create index if not exists idx_workspace_webhooks_ws_active
  on public.workspace_webhooks (workspace_id) where active = true;
