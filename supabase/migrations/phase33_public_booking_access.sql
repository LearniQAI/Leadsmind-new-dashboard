-- Enable public read access for booking calendars by slug
-- This allows the public booking page to fetch the calendar configuration
CREATE POLICY "Public read access for calendars" ON booking_calendars
    FOR SELECT USING (true);

-- Ensure appointments can be inserted by public users (clients)
CREATE POLICY "Public insert access for appointments" ON appointments
    FOR INSERT WITH CHECK (true);
