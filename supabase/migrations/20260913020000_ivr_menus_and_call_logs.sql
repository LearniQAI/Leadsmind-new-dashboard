-- Telephony Phase 3 — real IVR menu builder, call routing, voicemail, call logs.
--
-- Builds on Phase 2's public.workspace_phone_numbers (20260913010000). A number gets a real
-- IVR menu assigned via workspace_phone_numbers.active_ivr_menu_id; the assign action (Phase 3
-- server code) also points that number's real Twilio Voice URL at the new voice webhook, so an
-- actual inbound call is what drives all of this, not just app-side config.

-- ─────────────────────────────────────────────────────────────────────────
-- ivr_menus — one row per configured menu. A menu's own greeting is TTS-only for now
-- (Twilio's <Say>, per the PRD's recommended launch approach); upload/record/AI-voice greeting
-- inputs are a later phase. fallback_* covers "no input" / "invalid input after max retries".
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ivr_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  greeting_text TEXT NOT NULL,
  retry_limit INTEGER NOT NULL DEFAULT 3 CHECK (retry_limit BETWEEN 1 AND 5),
  -- Reached after retry_limit invalid/no-input attempts. 'hangup' just plays a goodbye message.
  fallback_destination_type TEXT NOT NULL DEFAULT 'hangup'
    CHECK (fallback_destination_type IN ('hangup', 'voicemail', 'forward')),
  fallback_destination_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Full call recording (distinct from voicemail, which always records) is legally sensitive
  -- (two-party consent jurisdictions) — off by default, real opt-in per menu.
  record_calls BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ivr_menus IS
  'Real per-workspace IVR menu configuration (Telephony Phase 3). Assigned to a workspace_phone_numbers row to actually take live inbound calls.';
COMMENT ON COLUMN public.ivr_menus.record_calls IS
  'Full-call recording opt-in. Distinct from voicemail (which always records the message left). May carry consent obligations depending on jurisdiction — surfaced in the builder UI, not just here.';

CREATE INDEX IF NOT EXISTS idx_ivr_menus_workspace ON public.ivr_menus(workspace_id);

ALTER TABLE public.ivr_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access for ivr_menus" ON public.ivr_menus;
CREATE POLICY "Workspace access for ivr_menus" ON public.ivr_menus
  FOR ALL USING (check_workspace_access(workspace_id))
  WITH CHECK (check_workspace_access(workspace_id));

-- ─────────────────────────────────────────────────────────────────────────
-- ivr_menu_options — the real keypad options within a menu.
-- destination_value shapes by destination_type:
--   submenu:    { "menuId": "<uuid>" }
--   forward:    { "number": "+27..." }
--   ring_group: { "strategy": "simultaneous" | "sequential", "numbers": ["+27...", ...] }
--   voicemail:  {} (workspace admins are notified by email on every voicemail left)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ivr_menu_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.ivr_menus(id) ON DELETE CASCADE,
  keypress TEXT NOT NULL CHECK (keypress IN ('0','1','2','3','4','5','6','7','8','9')),
  label TEXT,
  destination_type TEXT NOT NULL CHECK (destination_type IN ('submenu', 'forward', 'voicemail', 'ring_group')),
  destination_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (menu_id, keypress)
);

COMMENT ON TABLE public.ivr_menu_options IS
  'Real keypad routing options for an ivr_menus row (Telephony Phase 3).';

CREATE INDEX IF NOT EXISTS idx_ivr_menu_options_menu ON public.ivr_menu_options(menu_id);

ALTER TABLE public.ivr_menu_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access for ivr_menu_options" ON public.ivr_menu_options;
CREATE POLICY "Workspace access for ivr_menu_options" ON public.ivr_menu_options
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.ivr_menus m WHERE m.id = menu_id AND check_workspace_access(m.workspace_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ivr_menus m WHERE m.id = menu_id AND check_workspace_access(m.workspace_id))
  );

-- A submenu option must point at a menu in the SAME workspace — enforced in the server action
-- (which already has workspace_id in scope) since a cross-table CHECK can't see both rows'
-- workspace_id at once without a trigger; the RLS above still prevents cross-workspace reads.

-- ─────────────────────────────────────────────────────────────────────────
-- Assign a built menu to one of the workspace's real provisioned numbers. Nullable — a number
-- can exist (Phase 2) with no IVR configured yet, and unassigning must be possible without
-- deleting the number.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.workspace_phone_numbers
  ADD COLUMN IF NOT EXISTS active_ivr_menu_id UUID REFERENCES public.ivr_menus(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_phone_numbers_active_menu ON public.workspace_phone_numbers(active_ivr_menu_id);

-- ─────────────────────────────────────────────────────────────────────────
-- call_logs — one real row per real inbound call. workspace_id is denormalized here (rather
-- than requiring a join through phone_number_id) so RLS and listing stay a single-table query.
-- Populated across the lifetime of one call by three different webhook hits (initial, digit/
-- routing hits, and the final status callback) — see src/app/api/webhooks/twilio/voice/*.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES public.workspace_phone_numbers(id) ON DELETE SET NULL,
  twilio_call_sid TEXT NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  -- Twilio's own top-level call status once known (completed/no-answer/busy/failed/canceled);
  -- 'in-progress' is the local default until the status callback (or a routing terminal action)
  -- fills it in.
  call_status TEXT NOT NULL DEFAULT 'in-progress',
  -- Ordered trail of {menuId, menuName, keypress} the caller actually took.
  menu_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- How the call actually ended: forwarded / voicemail / hangup / max_retries_exceeded / no_menu_configured / ring_group_no_answer
  outcome TEXT,
  recording_url TEXT,
  voicemail_url TEXT,
  voicemail_duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (twilio_call_sid)
);

COMMENT ON TABLE public.call_logs IS
  'Real inbound call records for workspace_phone_numbers (Telephony Phase 3). One row per real Twilio CallSid, updated across the call''s webhook lifecycle.';

CREATE INDEX IF NOT EXISTS idx_call_logs_workspace ON public.call_logs(workspace_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_phone_number ON public.call_logs(phone_number_id);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access for call_logs" ON public.call_logs;
CREATE POLICY "Workspace access for call_logs" ON public.call_logs
  FOR ALL USING (check_workspace_access(workspace_id))
  WITH CHECK (check_workspace_access(workspace_id));

-- Shared updated_at trigger fn already created by 20260913010000_workspace_phone_numbers.sql
-- (set_workspace_phone_numbers_updated_at) is table-name-specific in its comment but not its
-- logic; reused here under its own trigger names for clarity per table.
DROP TRIGGER IF EXISTS trg_ivr_menus_updated_at ON public.ivr_menus;
CREATE TRIGGER trg_ivr_menus_updated_at
  BEFORE UPDATE ON public.ivr_menus
  FOR EACH ROW EXECUTE FUNCTION public.set_workspace_phone_numbers_updated_at();

DROP TRIGGER IF EXISTS trg_ivr_menu_options_updated_at ON public.ivr_menu_options;
CREATE TRIGGER trg_ivr_menu_options_updated_at
  BEFORE UPDATE ON public.ivr_menu_options
  FOR EACH ROW EXECUTE FUNCTION public.set_workspace_phone_numbers_updated_at();

DROP TRIGGER IF EXISTS trg_call_logs_updated_at ON public.call_logs;
CREATE TRIGGER trg_call_logs_updated_at
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_workspace_phone_numbers_updated_at();
