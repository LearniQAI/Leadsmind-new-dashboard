-- PHASE: FUNNEL BUILDER STEP-TYPE TAXONOMY (spine: opt_in -> sales_page -> order_form)
-- Adds step_type + config to funnel_steps, and a funnel_orders table for
-- PayFast-driven Order Form purchases, decoupled from invoices until paid.

-- ----------------------------------------------------------------
-- 1. funnel_steps: step_type + config
-- ----------------------------------------------------------------
ALTER TABLE public.funnel_steps
    ADD COLUMN IF NOT EXISTS step_type TEXT NOT NULL DEFAULT 'info_page',
    ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';

ALTER TABLE public.funnel_steps
    ADD CONSTRAINT funnel_steps_step_type_check CHECK (
        step_type IN (
            'opt_in', 'opt_in_thank_you', 'sales_page', 'order_form',
            'upsell', 'downsell', 'thank_you', 'info_page',
            'webinar_registration', 'webinar_thank_you', 'inline_popup_form'
        )
    );

-- Backfill existing rows: infer from name where obvious, else keep the
-- column default ('info_page') already applied by ADD COLUMN above.
UPDATE public.funnel_steps
SET step_type = 'opt_in'
WHERE step_type = 'info_page' AND name ILIKE '%opt-in%';

UPDATE public.funnel_steps
SET step_type = 'sales_page'
WHERE step_type = 'info_page' AND name ILIKE '%sales%';

UPDATE public.funnel_steps
SET step_type = 'order_form'
WHERE step_type = 'info_page' AND (name ILIKE '%order form%' OR name ILIKE '%checkout%');

UPDATE public.funnel_steps
SET step_type = 'thank_you'
WHERE step_type = 'info_page' AND name ILIKE '%thank%';

-- ----------------------------------------------------------------
-- 2. funnel_orders
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.funnel_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    funnel_id       UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
    funnel_step_id  UUID NOT NULL REFERENCES public.funnel_steps(id) ON DELETE CASCADE,
    contact_id      UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'abandoned')),
    amount          NUMERIC NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'ZAR',
    payfast_ref     TEXT,
    invoice_id      UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    next_step_id    UUID REFERENCES public.funnel_steps(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_orders_workspace_id ON public.funnel_orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_funnel_orders_funnel_step_id ON public.funnel_orders(funnel_step_id);

ALTER TABLE public.funnel_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for funnel orders" ON public.funnel_orders
    FOR ALL USING (check_workspace_access(workspace_id));

CREATE TRIGGER update_funnel_orders_updated_at BEFORE UPDATE ON public.funnel_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
