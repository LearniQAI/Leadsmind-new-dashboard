-- Sprint 4-7: Public Booking Pages, Forms & Payment Gateways

-- 1. Alter public.workspaces to add custom_domain column
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- 2. Alter public.users to add eskom_suburb_id column for load-shedding masking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS eskom_suburb_id TEXT;

-- 3. Alter public.booking_calendars to add custom_fields configuration
ALTER TABLE public.booking_calendars ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]';

-- 4. Create booking_leases table for temporary slot holds
CREATE TABLE IF NOT EXISTS public.booking_leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    calendar_id UUID NOT NULL REFERENCES public.booking_calendars(id) ON DELETE CASCADE,
    slot_time TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'holding' CHECK (status IN ('holding', 'released', 'confirmed')),
    session_id TEXT, -- Payment session or checkout reference
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(calendar_id, slot_time, status)
);

-- Enable RLS and add workspace access check policy
ALTER TABLE public.booking_leases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for booking_leases" ON public.booking_leases;
CREATE POLICY "Workspace access for booking_leases" ON public.booking_leases
    FOR ALL USING (check_workspace_access(workspace_id));

-- Add public read and write capability for leases so client bookings can create leases
DROP POLICY IF EXISTS "Public access for booking_leases" ON public.booking_leases;
CREATE POLICY "Public access for booking_leases" ON public.booking_leases
    FOR ALL USING (true);
