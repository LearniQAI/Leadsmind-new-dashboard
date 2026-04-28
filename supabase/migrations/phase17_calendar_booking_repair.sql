-- Phase 17: Calendar & Booking System with Smart AI Scheduling (REPAIR VERSION)

-- 1. Booking Calendars
CREATE TABLE IF NOT EXISTS booking_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    timezone TEXT DEFAULT 'UTC',
    slot_duration INTEGER DEFAULT 30, -- minutes
    buffer_time INTEGER DEFAULT 0, -- minutes
    availability JSONB DEFAULT '{"0": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": []}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, slug)
);

-- 2. Appointments (Ensure columns exist)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to existing appointments table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'calendar_id') THEN
        ALTER TABLE appointments ADD COLUMN calendar_id UUID REFERENCES booking_calendars(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'contact_id') THEN
        ALTER TABLE appointments ADD COLUMN contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'status') THEN
        ALTER TABLE appointments ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'showed_up', 'no_show', 'cancelled'));
    ELSE
        -- Ensure status check constraint is updated if needed
        ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
        ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'showed_up', 'no_show', 'cancelled'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'deal_id') THEN
        ALTER TABLE appointments ADD COLUMN deal_id UUID REFERENCES opportunities(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'metadata') THEN
        ALTER TABLE appointments ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'created_by') THEN
        ALTER TABLE appointments ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'updated_at') THEN
        ALTER TABLE appointments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- 3. Booking Slot Analytics
CREATE TABLE IF NOT EXISTS booking_slot_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    slot_day_of_week INTEGER NOT NULL CHECK (slot_day_of_week BETWEEN 0 AND 6),
    slot_hour INTEGER NOT NULL CHECK (slot_hour BETWEEN 0 AND 23),
    total_bookings INTEGER DEFAULT 0,
    show_up_count INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    converted_to_deal_count INTEGER DEFAULT 0,
    show_up_rate FLOAT DEFAULT 0,
    conversion_rate FLOAT DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, slot_day_of_week, slot_hour)
);

-- 4. RLS Policies
ALTER TABLE booking_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slot_analytics ENABLE ROW LEVEL SECURITY;

-- Helper to check workspace membership (Repeat in case it was missed, but use IF NOT EXISTS logic if possible)
-- Usually check_workspace_access is already defined in previous migrations (Phase 2)

-- Drop and recreate policies to ensure they are correct
DROP POLICY IF EXISTS "Workspace access for calendars" ON booking_calendars;
CREATE POLICY "Workspace access for calendars" ON booking_calendars
    FOR ALL USING (check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Workspace access for appointments" ON appointments;
CREATE POLICY "Workspace access for appointments" ON appointments
    FOR ALL USING (check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Workspace access for booking analytics" ON booking_slot_analytics;
CREATE POLICY "Workspace access for booking analytics" ON booking_slot_analytics
    FOR ALL USING (check_workspace_access(workspace_id));

-- 5. Automations & Triggers

-- Function to update analytics on booking
CREATE OR REPLACE FUNCTION fn_update_booking_analytics()
RETURNS TRIGGER AS $$
DECLARE
    slot_dow INTEGER;
    slot_h INTEGER;
BEGIN
    slot_dow := EXTRACT(DOW FROM NEW.start_time);
    slot_h := EXTRACT(HOUR FROM NEW.start_time);

    -- Ensure row exists
    INSERT INTO booking_slot_analytics (workspace_id, slot_day_of_week, slot_hour)
    VALUES (NEW.workspace_id, slot_dow, slot_h)
    ON CONFLICT (workspace_id, slot_day_of_week, slot_hour) DO NOTHING;

    -- Update based on status change
    IF (TG_OP = 'INSERT') THEN
        UPDATE booking_slot_analytics
        SET total_bookings = total_bookings + 1,
            last_updated = now()
        WHERE workspace_id = NEW.workspace_id 
          AND slot_day_of_week = slot_dow 
          AND slot_hour = slot_h;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            UPDATE booking_slot_analytics
            SET 
                show_up_count = show_up_count + (CASE WHEN NEW.status = 'showed_up' THEN 1 WHEN OLD.status = 'showed_up' THEN -1 ELSE 0 END),
                no_show_count = no_show_count + (CASE WHEN NEW.status = 'no_show' THEN 1 WHEN OLD.status = 'no_show' THEN -1 ELSE 0 END),
                show_up_rate = CASE 
                    WHEN total_bookings > 0 THEN (show_up_count + (CASE WHEN NEW.status = 'showed_up' THEN 1 WHEN OLD.status = 'showed_up' THEN -1 ELSE 0 END))::FLOAT / total_bookings 
                    ELSE 0 
                END,
                last_updated = now()
            WHERE workspace_id = NEW.workspace_id 
              AND slot_day_of_week = slot_dow 
              AND slot_hour = slot_h;
        END IF;

        -- Handle conversion (when deal_id is added)
        IF (OLD.deal_id IS NULL AND NEW.deal_id IS NOT NULL) THEN
            UPDATE booking_slot_analytics
            SET 
                converted_to_deal_count = converted_to_deal_count + 1,
                conversion_rate = CASE 
                    WHEN total_bookings > 0 THEN (converted_to_deal_count + 1)::FLOAT / total_bookings 
                    ELSE 0 
                END,
                last_updated = now()
            WHERE workspace_id = NEW.workspace_id 
              AND slot_day_of_week = slot_dow 
              AND slot_hour = slot_h;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_booking_analytics ON appointments;
CREATE TRIGGER tr_booking_analytics
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION fn_update_booking_analytics();

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_calendars_workspace ON booking_calendars(workspace_id);
CREATE INDEX IF NOT EXISTS idx_appointments_calendar ON appointments(calendar_id);
CREATE INDEX IF NOT EXISTS idx_appointments_workspace ON appointments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
