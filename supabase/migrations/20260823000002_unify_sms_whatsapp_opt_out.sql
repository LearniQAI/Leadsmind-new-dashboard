-- Unified marketing suppression: an opt-out on either SMS or WhatsApp applies to both.
UPDATE public.contacts
SET
  opted_out = TRUE,
  opted_in = FALSE,
  opt_out_date = COALESCE(opt_out_date, sms_opt_out_at, now()),
  sms_opt_out = TRUE,
  sms_opt_out_at = COALESCE(sms_opt_out_at, opt_out_date, now())
WHERE COALESCE(opted_out, FALSE) OR COALESCE(sms_opt_out, FALSE);
