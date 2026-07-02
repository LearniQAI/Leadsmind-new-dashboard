-- Create RPC function to atomically increment email campaign metrics

CREATE OR REPLACE FUNCTION public.increment_campaign_metric(c_id UUID, metric_name TEXT)
RETURNS VOID AS $$
BEGIN
    IF metric_name = 'open' THEN
        UPDATE public.email_campaigns SET opens = opens + 1 WHERE id = c_id;
    ELSIF metric_name = 'click' THEN
        UPDATE public.email_campaigns SET clicks = clicks + 1 WHERE id = c_id;
    ELSIF metric_name = 'reply' THEN
        UPDATE public.email_campaigns SET replied = replied + 1 WHERE id = c_id;
    ELSIF metric_name = 'bounce' THEN
        UPDATE public.email_campaigns SET bounces = bounces + 1 WHERE id = c_id;
    ELSIF metric_name = 'complaint' THEN
        UPDATE public.email_campaigns SET complaints = complaints + 1 WHERE id = c_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
