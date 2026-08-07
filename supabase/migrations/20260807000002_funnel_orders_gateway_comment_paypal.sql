-- funnel_orders.gateway has no CHECK constraint, so no schema change is
-- needed to accept 'paypal' as a value — this migration only keeps the
-- column comment (added in 20260807000000_funnel_orders_generic_gateway.sql)
-- accurate now that PayPal Commerce Platform is a supported gateway.
COMMENT ON COLUMN public.funnel_orders.gateway IS 'Which payment gateway this order was checked out through: payfast | stripe | paystack | flutterwave | ozow | paypal.';
