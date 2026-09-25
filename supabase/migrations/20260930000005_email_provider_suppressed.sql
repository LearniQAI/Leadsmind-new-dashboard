-- email.suppressed: the provider refused a send because the address is on ITS account-level
-- suppression list (Resend auto-suppresses addresses that hard-bounce or complain). Recorded as an
-- event and as a workspace suppression with its own source, so every suppression-aware send path
-- stops retrying an address the provider will not deliver to anyway.
ALTER TABLE public.global_suppression_list DROP CONSTRAINT IF EXISTS global_suppression_list_source_check;
ALTER TABLE public.global_suppression_list ADD CONSTRAINT global_suppression_list_source_check
  CHECK (source IN ('unsubscribe', 'bounce', 'complaint', 'manual', 'erasure', 'provider_suppressed'));

ALTER TABLE public.email_tracking_logs DROP CONSTRAINT IF EXISTS email_tracking_logs_event_type_check;
ALTER TABLE public.email_tracking_logs ADD CONSTRAINT email_tracking_logs_event_type_check
  CHECK (event_type IN ('sent', 'delivered', 'delivery_delayed', 'bounce', 'complaint', 'open', 'click', 'reply', 'failed', 'suppressed'));
