-- WhatsApp Broadcast B1a: record how a campaign's audience was chosen and what it resolved to.
-- Additive and nullable; no other table is changed. Existing rows keep NULLs (legacy segment/rule/tags campaigns).
--   audience_type       all_contacts | tags | contact_fields | saved_segment | legacy
--   audience_definition the chosen source, e.g. {"type":"tags","tags":["vip"],"mode":"any"}
--   audience_snapshot   {resolvedAt, counts:{matched,eligible}, exclusions:{no_phone,invalid_number,opted_out,suppressed,duplicate_phone}}
--   compliance_ack      {userId, ts, textVersion}: the sender's consent attestation at creation time
alter table public.whatsapp_broadcast_campaigns
  add column if not exists audience_type text,
  add column if not exists audience_definition jsonb,
  add column if not exists audience_snapshot jsonb,
  add column if not exists compliance_ack jsonb;
