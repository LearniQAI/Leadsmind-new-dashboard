-- Priority 0 security remediation (item 3, calendar/booking module).
--
-- 1. public.appointments — "Public insert access for appointments" was
--    WITH CHECK (true), fully open: any caller (bypassing the app layer
--    entirely, hitting PostgREST with the anon key) could insert an
--    appointment tied to any calendar_id/workspace_id pair, including a
--    calendar_id that doesn't actually belong to the claimed workspace_id.
--    booking_calendars already has a "Public read access for calendars"
--    USING (true) SELECT policy, so a plain correlated subquery (no
--    SECURITY DEFINER needed) can verify the binding under the anon role.
--    The public booking flow (calendar/public.ts: bookAppointment) always
--    derives workspace_id from the real booking_calendars row server-side
--    already, so this doesn't change its behavior — it closes the gap for
--    anyone going around that app-layer derivation.
--
-- 2. public.meet_attendance_logs — "Public access for meet_attendance_logs"
--    was USING (true) for ALL commands: fully open read/write for any
--    workspace's attendance logs, no relationship check at all. Tightened to
--    require appointment_id to reference a real appointments row whose
--    workspace_id matches the log row's own workspace_id. appointments has
--    no public SELECT policy, so the correlated check needs a SECURITY
--    DEFINER helper (bypasses RLS internally) rather than a plain subquery —
--    same pattern as workspace_has_pages() from the contacts fix.

DROP POLICY IF EXISTS "Public insert access for appointments" ON public.appointments;

CREATE POLICY "Public insert access for appointments"
    ON public.appointments FOR INSERT
    WITH CHECK (
        calendar_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.booking_calendars
            WHERE booking_calendars.id = appointments.calendar_id
              AND booking_calendars.workspace_id = appointments.workspace_id
        )
    );

CREATE OR REPLACE FUNCTION public.appointment_workspace_matches(p_appointment_id uuid, p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = p_appointment_id
      AND appointments.workspace_id = p_workspace_id
  );
$$;

REVOKE ALL ON FUNCTION public.appointment_workspace_matches(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.appointment_workspace_matches(uuid, uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public access for meet_attendance_logs" ON public.meet_attendance_logs;

CREATE POLICY "Public access for meet_attendance_logs"
    ON public.meet_attendance_logs FOR ALL
    USING (public.appointment_workspace_matches(appointment_id, workspace_id))
    WITH CHECK (public.appointment_workspace_matches(appointment_id, workspace_id));
