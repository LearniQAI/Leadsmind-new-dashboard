-- WhatsApp connection dedup (audit finding: two workspaces, b83f0966 and 1f061259, held
-- platform_connections rows for the identical Cloud API phone_number_id/waba_id). The inbound
-- webhook resolves the owning workspace with `.limit(1).maybeSingle()` and no ORDER BY -- with two
-- matching rows that resolution is undefined, not just "currently happens to pick one": a reindex,
-- vacuum, or query-plan change could silently flip which workspace receives every future message
-- for that number, with zero warning. A physical WhatsApp Cloud API number can only ever be
-- registered to one app-side connection at a time, so this must be unique across the whole table,
-- not just per workspace (platform_connections_workspace_id_platform_key already covers per-workspace
-- uniqueness, which doesn't help here).
--
-- Partial (platform = 'whatsapp' only, phone_number_id present only): a connecting/incomplete
-- WhatsApp row with no phone_number_id yet doesn't collide with a real, already-registered one.
CREATE UNIQUE INDEX IF NOT EXISTS platform_connections_whatsapp_phone_number_unique
  ON public.platform_connections ((credentials ->> 'phone_number_id'))
  WHERE platform = 'whatsapp' AND credentials ->> 'phone_number_id' IS NOT NULL;
