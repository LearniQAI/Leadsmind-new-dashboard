-- PHASE 3: Webinar registration — capture-only scope (per sign-off): registration
-- captures name/email + a fixed session date/time the funnel owner configured,
-- creates a contact + a registration record, and joins a real internal Jitsi room
-- (appointments.meeting_mode = 'internal_meet', reusing the already-working
-- /meet/[id] mechanism) shared by every registrant for that step's session —
-- NOT a fake Zoom/Google Meet link. External Zoom/Meet/Teams integration and
-- host-side webinar controls remain explicitly deferred to Milestone 3.
--
-- One funnel_step = one session = one shared appointments row (lazily created on
-- the first registrant). appointments.contact_id/calendar_id are both nullable
-- (confirmed against the live schema), so the shared session row has neither —
-- individual registrants are tracked here instead, each with their own contact_id.
CREATE TABLE IF NOT EXISTS public.webinar_registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    funnel_id       UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
    funnel_step_id  UUID NOT NULL REFERENCES public.funnel_steps(id) ON DELETE CASCADE,
    contact_id      UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    appointment_id  UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'no_show')),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webinar_registrations_workspace_id ON public.webinar_registrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webinar_registrations_funnel_step_id ON public.webinar_registrations(funnel_step_id);
CREATE INDEX IF NOT EXISTS idx_webinar_registrations_appointment_id ON public.webinar_registrations(appointment_id);

ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for webinar registrations" ON public.webinar_registrations
    FOR ALL USING (check_workspace_access(workspace_id));
