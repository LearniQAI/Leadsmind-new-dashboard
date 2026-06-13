-- Sprint 1: Multi-Tenant Database Architecture & Core Schemas

-- 1. Alter public.users to add province column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS province TEXT DEFAULT 'GP' CHECK (province IN ('ALL', 'GP', 'WC', 'KZN', 'EC', 'FS', 'LP', 'MP', 'NW', 'NC'));

-- 2. Create meet_audit_trails table
CREATE TABLE IF NOT EXISTS public.meet_audit_trails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'cancel', 'status_change', 'config_change'
    entity_type TEXT NOT NULL, -- 'booking', 'appointment_type', 'availability_profile', 'override', 'connection'
    entity_id UUID NOT NULL,
    previous_state JSONB DEFAULT '{}',
    new_state JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and add workspace access check policy
ALTER TABLE public.meet_audit_trails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for meet_audit_trails" ON public.meet_audit_trails;
CREATE POLICY "Workspace access for meet_audit_trails" ON public.meet_audit_trails
    FOR ALL USING (check_workspace_access(workspace_id));

-- 3. Create host_availability_profiles table
CREATE TABLE IF NOT EXISTS public.host_availability_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    enabled BOOLEAN NOT NULL DEFAULT true,
    slots JSONB NOT NULL DEFAULT '[]', -- Array of {start: "HH:MM", end: "HH:MM"}
    buffer_time INTEGER DEFAULT 0, -- buffer in minutes
    minimum_notice_period INTEGER DEFAULT 120, -- notice period in minutes
    maximum_days_in_advance INTEGER DEFAULT 60, -- max days ahead a booking can be made
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, day_of_week)
);

-- Enable RLS and add workspace access check policy
ALTER TABLE public.host_availability_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for host_availability_profiles" ON public.host_availability_profiles;
CREATE POLICY "Workspace access for host_availability_profiles" ON public.host_availability_profiles
    FOR ALL USING (check_workspace_access(workspace_id));

-- 4. Create meet_date_overrides table
CREATE TABLE IF NOT EXISTS public.meet_date_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    override_date DATE NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false, -- If false, day is fully blocked
    slots JSONB NOT NULL DEFAULT '[]', -- Array of {start: "HH:MM", end: "HH:MM"} if enabled is true
    reason TEXT, -- 'leave', 'public_holiday', 'personal_reason'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, override_date)
);

-- Enable RLS and add workspace access check policy
ALTER TABLE public.meet_date_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for meet_date_overrides" ON public.meet_date_overrides;
CREATE POLICY "Workspace access for meet_date_overrides" ON public.meet_date_overrides
    FOR ALL USING (check_workspace_access(workspace_id));

-- 5. Create sa_public_holidays table
CREATE TABLE IF NOT EXISTS public.sa_public_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    province TEXT NOT NULL DEFAULT 'ALL', -- 'ALL' or specific codes: 'GP', 'WC', etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and add public read access policy
ALTER TABLE public.sa_public_holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read for sa_public_holidays" ON public.sa_public_holidays;
CREATE POLICY "Public read for sa_public_holidays" ON public.sa_public_holidays
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- 6. Create user_calendar_connections table
CREATE TABLE IF NOT EXISTS public.user_calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
    credentials JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'error', 'pending')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id, provider)
);

-- Enable RLS and add workspace access check policy
ALTER TABLE public.user_calendar_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for user_calendar_connections" ON public.user_calendar_connections;
CREATE POLICY "Workspace access for user_calendar_connections" ON public.user_calendar_connections
    FOR ALL USING (check_workspace_access(workspace_id));

-- 7. Audit Triggers
-- Function for auditing appointments
CREATE OR REPLACE FUNCTION public.fn_audit_appointment_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_workspace_id UUID;
    v_actor_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_workspace_id := OLD.workspace_id;
        v_actor_id := auth.uid();
        INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
        VALUES (v_workspace_id, v_actor_id, 'delete', 'booking', OLD.id, row_to_json(OLD)::jsonb, '{}'::jsonb);
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        v_workspace_id := NEW.workspace_id;
        v_actor_id := COALESCE(NEW.created_by, auth.uid());
        INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
        VALUES (v_workspace_id, v_actor_id, 'create', 'booking', NEW.id, '{}'::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_workspace_id := NEW.workspace_id;
        v_actor_id := auth.uid();
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
            VALUES (v_workspace_id, v_actor_id, 'status_change', 'booking', NEW.id, jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
        ELSE
            INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
            VALUES (v_workspace_id, v_actor_id, 'update', 'booking', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_appointments ON public.appointments;
CREATE TRIGGER tr_audit_appointments
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_appointment_changes();

-- Function for auditing calendars (Appointment Types)
CREATE OR REPLACE FUNCTION public.fn_audit_calendar_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_workspace_id UUID;
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF TG_OP = 'DELETE' THEN
        v_workspace_id := OLD.workspace_id;
        INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
        VALUES (v_workspace_id, v_actor_id, 'delete', 'appointment_type', OLD.id, row_to_json(OLD)::jsonb, '{}'::jsonb);
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        v_workspace_id := NEW.workspace_id;
        INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
        VALUES (v_workspace_id, v_actor_id, 'create', 'appointment_type', NEW.id, '{}'::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_workspace_id := NEW.workspace_id;
        INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
        VALUES (v_workspace_id, v_actor_id, 'config_change', 'appointment_type', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_calendars ON public.booking_calendars;
CREATE TRIGGER tr_audit_calendars
AFTER INSERT OR UPDATE OR DELETE ON public.booking_calendars
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_calendar_changes();

-- 8. CRM Activity Sync Trigger
CREATE OR REPLACE FUNCTION public.fn_sync_appointment_to_crm_activities()
RETURNS TRIGGER AS $$
DECLARE
    v_desc TEXT;
BEGIN
    IF NEW.contact_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_desc := 'Consultation scheduled: ' || NEW.title || ' at ' || to_char(NEW.start_time, 'YYYY-MM-DD HH24:MI');
        INSERT INTO public.contact_activities (workspace_id, contact_id, type, description, metadata, created_by)
        VALUES (
            NEW.workspace_id, 
            NEW.contact_id, 
            'booking_scheduled', 
            v_desc, 
            jsonb_build_object('appointment_id', NEW.id, 'start_time', NEW.start_time, 'end_time', NEW.end_time),
            NEW.created_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NEW.status = 'cancelled' THEN
                v_desc := 'Consultation cancelled: ' || NEW.title;
                INSERT INTO public.contact_activities (workspace_id, contact_id, type, description, metadata)
                VALUES (
                    NEW.workspace_id, 
                    NEW.contact_id, 
                    'meeting', 
                    v_desc, 
                    jsonb_build_object('appointment_id', NEW.id, 'status', NEW.status)
                );
            ELSIF NEW.status = 'no_show' THEN
                v_desc := 'Consultation no-show: ' || NEW.title;
                INSERT INTO public.contact_activities (workspace_id, contact_id, type, description, metadata)
                VALUES (
                    NEW.workspace_id, 
                    NEW.contact_id, 
                    'booking_noshow', 
                    v_desc, 
                    jsonb_build_object('appointment_id', NEW.id, 'status', NEW.status)
                );
            ELSIF NEW.status = 'showed_up' THEN
                v_desc := 'Consultation attended: ' || NEW.title;
                INSERT INTO public.contact_activities (workspace_id, contact_id, type, description, metadata)
                VALUES (
                    NEW.workspace_id, 
                    NEW.contact_id, 
                    'meeting', 
                    v_desc, 
                    jsonb_build_object('appointment_id', NEW.id, 'status', NEW.status)
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_appointment_to_crm ON public.appointments;
CREATE TRIGGER tr_sync_appointment_to_crm
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_appointment_to_crm_activities();

-- 9. Pre-seed South African Public Holidays for 2026 and 2027
INSERT INTO public.sa_public_holidays (holiday_date, name, province) VALUES
-- 2026
('2026-01-01', 'New Year''s Day', 'ALL'),
('2026-03-21', 'Human Rights Day', 'ALL'),
('2026-04-03', 'Good Friday', 'ALL'),
('2026-04-06', 'Family Day', 'ALL'),
('2026-04-27', 'Freedom Day', 'ALL'),
('2026-05-01', 'Workers'' Day', 'ALL'),
('2026-06-16', 'Youth Day', 'ALL'),
('2026-08-09', 'National Women''s Day', 'ALL'),
('2026-08-10', 'Public Holiday (National Women''s Day observed)', 'ALL'),
('2026-09-24', 'Heritage Day', 'ALL'),
('2026-12-16', 'Day of Reconciliation', 'ALL'),
('2026-12-25', 'Christmas Day', 'ALL'),
('2026-12-26', 'Day of Goodwill', 'ALL'),
-- 2027
('2027-01-01', 'New Year''s Day', 'ALL'),
('2027-03-21', 'Human Rights Day', 'ALL'),
('2027-03-22', 'Public Holiday (Human Rights Day observed)', 'ALL'),
('2027-03-26', 'Good Friday', 'ALL'),
('2027-03-29', 'Family Day', 'ALL'),
('2027-04-27', 'Freedom Day', 'ALL'),
('2027-05-01', 'Workers'' Day', 'ALL'),
('2027-06-16', 'Youth Day', 'ALL'),
('2027-08-09', 'National Women''s Day', 'ALL'),
('2027-09-24', 'Heritage Day', 'ALL'),
('2027-12-16', 'Day of Reconciliation', 'ALL'),
('2027-12-25', 'Christmas Day', 'ALL'),
('2027-12-26', 'Day of Goodwill', 'ALL'),
('2027-12-27', 'Public Holiday (Day of Goodwill observed)', 'ALL')
ON CONFLICT (holiday_date) DO UPDATE SET name = EXCLUDED.name, province = EXCLUDED.province;
