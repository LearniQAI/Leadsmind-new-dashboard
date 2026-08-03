-- PHASE 2: Upsell/Downsell — links an upsell/downsell charge back to the order
-- it followed, so a Thank-you page can resolve the full purchase chain
-- (original + any accepted upsell/downsell) and so decline-chain routing has
-- a stable parent to reference.
ALTER TABLE public.funnel_orders
    ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES public.funnel_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_funnel_orders_parent_order_id ON public.funnel_orders(parent_order_id);
