-- SMS/WhatsApp opt-out, made reliable.
--
-- 1. normalize_phone_e164 + contacts.phone_e164 (generated): stored phones were mostly
--    "082 123 4567" (22 of 26), so an inbound STOP from "+27821234567" could never be matched by
--    exact equality, and every sender's ad-hoc `'+' + phone` produced an invalid "+082 123 4567".
--    A GENERATED column means every write path (forms, imports, API, UI) gets a normalized
--    value automatically, and matching is one indexed equality.
--    Rules (mirrored exactly by src/lib/phone.ts):
--      +<8-15 digits>                 -> as is
--      +0<9 digits>                   -> a local ZA number someone prefixed with '+' (no country
--                                        code starts with 0) -> +27<9 digits>
--      00<8-15 digits>                -> +<digits>
--      0<9 digits>   (10 digits)      -> +27<9 digits>   (South Africa is the platform default)
--      27<9 digits>  (11 digits)      -> +27<9 digits>
--      anything else                  -> NULL (unknown country: never guessed)
--    A leading "whatsapp:" is ignored.
--
-- 2. sms_suppression_list: the phone-side counterpart of global_suppression_list. An opt-out used
--    to live ONLY on the contact row (contacts.sms_opt_out / opted_out), so deleting and
--    re-importing a contact silently re-subscribed them. Keyed by (workspace, E.164 phone), it
--    survives any contact churn and can record a STOP from a number that is not (yet) a contact.
--    Written only by the service role (STOP webhook); workspace members may read it.

CREATE OR REPLACE FUNCTION public.normalize_phone_e164(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
DECLARE
    v text;
    digits text;
BEGIN
    IF raw IS NULL THEN RETURN NULL; END IF;
    v := btrim(regexp_replace(raw, '^\s*whatsapp:', '', 'i'));
    digits := regexp_replace(v, '[^0-9]', '', 'g');
    IF digits = '' THEN RETURN NULL; END IF;

    IF v LIKE '+%' THEN
        IF left(digits, 1) = '0' THEN
            IF length(digits) = 10 THEN RETURN '+27' || substr(digits, 2); END IF;
            RETURN NULL;
        END IF;
        IF length(digits) BETWEEN 8 AND 15 THEN RETURN '+' || digits; END IF;
        RETURN NULL;
    END IF;

    IF left(digits, 2) = '00' THEN
        IF length(digits) - 2 BETWEEN 8 AND 15 THEN RETURN '+' || substr(digits, 3); END IF;
        RETURN NULL;
    END IF;
    IF left(digits, 1) = '0' AND length(digits) = 10 THEN RETURN '+27' || substr(digits, 2); END IF;
    IF left(digits, 2) = '27' AND length(digits) = 11 THEN RETURN '+' || digits; END IF;
    RETURN NULL;
END;
$$;

ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS phone_e164 text GENERATED ALWAYS AS (public.normalize_phone_e164(phone)) STORED;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_phone_e164
    ON public.contacts (workspace_id, phone_e164)
    WHERE phone_e164 IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sms_suppression_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    phone_e164 TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT 'stop_keyword',
    source TEXT,
    message_sid TEXT,
    suppressed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, phone_e164)
);

CREATE INDEX IF NOT EXISTS idx_sms_suppression_phone ON public.sms_suppression_list (phone_e164);

ALTER TABLE public.sms_suppression_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members read SMS suppression" ON public.sms_suppression_list;
CREATE POLICY "Workspace members read SMS suppression" ON public.sms_suppression_list
    FOR SELECT USING (public.check_workspace_access(workspace_id));
-- No INSERT/UPDATE/DELETE policy: only the service role (STOP/START webhook) writes.

-- Carry over opt-outs that exist today only as contact flags.
INSERT INTO public.sms_suppression_list (workspace_id, phone_e164, reason, source)
SELECT DISTINCT ON (c.workspace_id, c.phone_e164) c.workspace_id, c.phone_e164, 'backfill_contact_flag', 'migration'
FROM public.contacts c
WHERE c.phone_e164 IS NOT NULL AND (COALESCE(c.sms_opt_out, false) OR COALESCE(c.opted_out, false))
ON CONFLICT (workspace_id, phone_e164) DO NOTHING;
