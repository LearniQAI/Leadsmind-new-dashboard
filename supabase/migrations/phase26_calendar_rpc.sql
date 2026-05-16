-- Phase 26: LeadsMind Appointment Calendar v2.0 RPC Functions

-- Function to atomically update Round Robin assignment stats
CREATE OR REPLACE FUNCTION public.fn_increment_rr_stats(
    p_calendar_id UUID,
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.round_robin_assignment
    SET 
        booking_count = booking_count + 1,
        last_assigned_at = now()
    WHERE 
        calendar_id = p_calendar_id 
        AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
