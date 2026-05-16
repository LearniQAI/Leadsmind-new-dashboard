-- Phase 25: LeadsMind Appointment Calendar v2.0 Schema Alignment (ULTRA-ROBUST)

-- 1. Ensure core columns exist on booking_calendars
DO $$ 
BEGIN 
    -- Ensure workspace_id exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'booking_calendars' AND COLUMN_NAME = 'workspace_id' AND TABLE_SCHEMA = 'public') THEN
        ALTER TABLE public.booking_calendars ADD COLUMN workspace_id UUID;
    END IF;

    -- Add Calendar Type
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'booking_calendars' AND COLUMN_NAME = 'calendar_type' AND TABLE_SCHEMA = 'public') THEN
        ALTER TABLE public.booking_calendars ADD COLUMN calendar_type TEXT DEFAULT 'personal' CHECK (calendar_type IN ('personal', 'round_robin', 'collective', 'class_booking', 'service_menu', 'event'));
    END IF;

    -- Add Meeting Mode
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'booking_calendars' AND COLUMN_NAME = 'meeting_mode' AND TABLE_SCHEMA = 'public') THEN
        ALTER TABLE public.booking_calendars ADD COLUMN meeting_mode TEXT DEFAULT 'custom_link' CHECK (meeting_mode IN ('google_meet', 'zoom', 'phone', 'in_person', 'custom_link', 'client_choice'));
    END IF;

    -- Add Capacity for Class Bookings
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'booking_calendars' AND COLUMN_NAME = 'capacity' AND TABLE_SCHEMA = 'public') THEN
        ALTER TABLE public.booking_calendars ADD COLUMN capacity INTEGER DEFAULT 1;
    END IF;

    -- Add Pricing for Service Menu
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'booking_calendars' AND COLUMN_NAME = 'price' AND TABLE_SCHEMA = 'public') THEN
        ALTER TABLE public.booking_calendars ADD COLUMN price DECIMAL(12,2) DEFAULT 0;
    END IF;

    -- Add Waitlist Toggle
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'booking_calendars' AND COLUMN_NAME = 'waitlist_enabled' AND TABLE_SCHEMA = 'public') THEN
        ALTER TABLE public.booking_calendars ADD COLUMN waitlist_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Round Robin Assignments Table
CREATE TABLE IF NOT EXISTS public.round_robin_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    calendar_id UUID NOT NULL,
    user_id UUID NOT NULL,
    weight INTEGER DEFAULT 1,
    booking_count INTEGER DEFAULT 0,
    last_assigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(calendar_id, user_id)
);

-- Ensure workspace_id exists if table already existed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'round_robin_assignment' AND COLUMN_NAME = 'workspace_id' AND TABLE_SCHEMA = 'public') THEN
        ALTER TABLE public.round_robin_assignment ADD COLUMN workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Service Items (for Service Menu)
CREATE TABLE IF NOT EXISTS public.service_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 30,
    price DECIMAL(12,2) DEFAULT 0,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure workspace_id exists if table already existed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'service_items' AND COLUMN_NAME = 'workspace_id' AND TABLE_SCHEMA = 'public') THEN
        ALTER TABLE public.service_items ADD COLUMN workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. RLS Policies for new tables
ALTER TABLE public.round_robin_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for rr_assignment" ON public.round_robin_assignment;
CREATE POLICY "Workspace access for rr_assignment" ON public.round_robin_assignment
    FOR ALL USING (
        workspace_id IN (
            SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Workspace access for service_items" ON public.service_items;
CREATE POLICY "Workspace access for service_items" ON public.service_items
    FOR ALL USING (
        workspace_id IN (
            SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
        )
    );

-- 5. Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.round_robin_assignment;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.service_items;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
