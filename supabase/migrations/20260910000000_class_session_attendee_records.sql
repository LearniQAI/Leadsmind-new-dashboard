-- Per-attendee records for booked class-session attendees.
--
-- Problem: fn_secure_booking_or_waitlist's "booked" branch only incremented
-- appointments.current_attendee_count — it never created a row linking a
-- SPECIFIC person to their spot. So only the session's original contact_id
-- (the first booker, who created the session) had any self-service manage
-- link; every other booked attendee could not see, manage, or cancel their
-- own spot.
--
-- Decision (Step 1.2): EXTEND booking_waitlists rather than add a new
-- class_session_attendees table. booking_waitlists is already "a contact's
-- relationship to a group session" — UNIQUE(appointment_id, contact_id),
-- a `confirmed` flag, FKs to appointment + contact. The waitlist-accept flow
-- (Task 65) already produces exactly the row we want (confirmed = true). A
-- separate table would duplicate that structure and force every waitlist
-- query to UNION two tables. One table, one lifecycle:
--     waiting   : confirmed = false, position IS NOT NULL, cancelled_at IS NULL
--     confirmed : confirmed = true,  position IS NULL,     cancelled_at IS NULL
--     cancelled : cancelled_at IS NOT NULL
-- All existing queue logic filters `confirmed = false`, so confirmed
-- attendee rows are naturally excluded from offer/advance/cron.

-- 1. A booked attendee has no queue position.
ALTER TABLE public.booking_waitlists ALTER COLUMN position DROP NOT NULL;

-- 2. Lifecycle timestamps.
ALTER TABLE public.booking_waitlists ADD COLUMN IF NOT EXISTS booked_at TIMESTAMPTZ;
ALTER TABLE public.booking_waitlists ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

COMMENT ON TABLE public.booking_waitlists IS
  'A contact''s participation record for a group-session appointment. confirmed=false + position => on the waitlist; confirmed=true + cancelled_at IS NULL => holds a spot; cancelled_at set => cancelled their spot. One row per (appointment_id, contact_id).';

-- 3. Hot path: "active confirmed attendees for a session" (portal visibility,
--    session-level cancel notifications, capacity reconciliation).
CREATE INDEX IF NOT EXISTS idx_booking_waitlists_active_confirmed
  ON public.booking_waitlists (appointment_id)
  WHERE confirmed = true AND cancelled_at IS NULL;

-- 4. Backfill: rows Task 65's accept flow already confirmed get a booked_at.
UPDATE public.booking_waitlists
   SET booked_at = COALESCE(offered_at, created_at)
 WHERE confirmed = true AND booked_at IS NULL;

-- 5. Atomic booking — "booked" mode now also writes the per-attendee record,
--    in the same transaction as the counter increment. Idempotent: a contact
--    who already holds an active confirmed spot is not double-counted.
CREATE OR REPLACE FUNCTION fn_secure_booking_or_waitlist(
    p_workspace_id UUID,
    p_appointment_id UUID,
    p_contact_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_apt RECORD;
    v_existing RECORD;
    v_waitlist_pos INTEGER;
    v_attendee_id UUID;
BEGIN
    -- Lock the session row to prevent concurrent overbooking.
    SELECT * INTO v_apt
    FROM appointments
    WHERE id = p_appointment_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;

    -- Already holding an active confirmed spot -> idempotent, don't re-count.
    SELECT * INTO v_existing
    FROM booking_waitlists
    WHERE appointment_id = p_appointment_id
      AND contact_id = p_contact_id
      AND confirmed = true
      AND cancelled_at IS NULL;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'mode', 'already_booked',
                                  'attendee_id', v_existing.id, 'appointment_id', p_appointment_id);
    END IF;

    IF (v_apt.current_attendee_count < v_apt.max_attendees) THEN
        UPDATE appointments
        SET current_attendee_count = current_attendee_count + 1, updated_at = now()
        WHERE id = p_appointment_id;

        INSERT INTO booking_waitlists
            (workspace_id, appointment_id, contact_id, position, confirmed, booked_at, cancelled_at, updated_at)
        VALUES
            (p_workspace_id, p_appointment_id, p_contact_id, NULL, true, now(), NULL, now())
        ON CONFLICT (appointment_id, contact_id) DO UPDATE
            SET confirmed = true,
                cancelled_at = NULL,
                booked_at = now(),
                position = NULL,
                offered_at = NULL,
                offer_expires_at = NULL,
                updated_at = now()
        RETURNING id INTO v_attendee_id;

        RETURN jsonb_build_object('success', true, 'mode', 'booked',
                                  'attendee_id', v_attendee_id, 'appointment_id', p_appointment_id);
    ELSE
        IF (v_apt.waitlist_enabled) THEN
            SELECT COALESCE(MAX(position), 0) + 1 INTO v_waitlist_pos
            FROM booking_waitlists
            WHERE appointment_id = p_appointment_id;

            INSERT INTO booking_waitlists
                (workspace_id, appointment_id, contact_id, position, confirmed, updated_at)
            VALUES
                (p_workspace_id, p_appointment_id, p_contact_id, v_waitlist_pos, false, now())
            ON CONFLICT (appointment_id, contact_id) DO UPDATE
                SET position = EXCLUDED.position,
                    confirmed = false,
                    cancelled_at = NULL,
                    updated_at = now()
            RETURNING id INTO v_attendee_id;

            RETURN jsonb_build_object('success', true, 'mode', 'waitlist',
                                      'position', v_waitlist_pos, 'attendee_id', v_attendee_id);
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Session is full and waitlist is disabled');
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;
