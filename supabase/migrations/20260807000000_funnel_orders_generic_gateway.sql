-- Tasks 35-37: bring-your-own-API-key Paystack/Flutterwave/Ozow checkout.
-- funnel_orders.payfast_ref was the only gateway-reference column that existed
-- (confirmed live: 20260803000000_funnel_step_type_taxonomy.sql), hardcoded to
-- one provider. Adding a generic discriminator + reference pair so the webhook
-- handlers for the 3 new gateways (and Stripe, if ever routed through funnel
-- orders) can resolve back to the same row without a payfast-specific column.
-- payfast_ref is left in place — existing rows/code path are untouched.
ALTER TABLE public.funnel_orders
  ADD COLUMN IF NOT EXISTS gateway TEXT NOT NULL DEFAULT 'payfast',
  ADD COLUMN IF NOT EXISTS gateway_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_funnel_orders_gateway_ref ON public.funnel_orders(gateway_ref) WHERE gateway_ref IS NOT NULL;

COMMENT ON COLUMN public.funnel_orders.gateway IS 'Which payment gateway this order was checked out through: payfast | stripe | paystack | flutterwave | ozow.';
COMMENT ON COLUMN public.funnel_orders.gateway_ref IS 'Provider-side transaction reference — used by the matching webhook to resolve back to this row.';
