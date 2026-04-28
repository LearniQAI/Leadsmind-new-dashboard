-- PHASE 15: E-COMMERCE & SALES TOOLS

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('physical', 'digital', 'service')),
    price NUMERIC NOT NULL,
    compare_at_price NUMERIC,
    currency TEXT DEFAULT 'USD',
    images TEXT[], -- Supabase Storage URLs
    digital_file_url TEXT,
    sku TEXT,
    stock_quantity INTEGER, -- NULL = unlimited
    is_active BOOLEAN DEFAULT true,
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Offers Table (Bundles)
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT,
    product_ids UUID[],
    discount_type TEXT CHECK (discount_type IN ('percent', 'fixed')),
    discount_value NUMERIC,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('pending', 'paid', 'fulfilled', 'refunded', 'cancelled')) DEFAULT 'pending',
    subtotal NUMERIC,
    discount NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    total NUMERIC,
    stripe_payment_intent_id TEXT,
    stripe_session_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC NOT NULL, -- Snapshot at time of purchase
    total NUMERIC NOT NULL
);

-- Upsells Table
CREATE TABLE IF NOT EXISTS public.upsells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    trigger_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    offer_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('upsell', 'downsell')),
    discount_percent INTEGER,
    headline TEXT,
    description TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS POLICIES FOR PHASE 15
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsells ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Products Access') THEN
        CREATE POLICY "Workspace Products Access" ON public.products
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Orders Access') THEN
        CREATE POLICY "Workspace Orders Access" ON public.orders
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Order Items Access') THEN
        CREATE POLICY "Workspace Order Items Access" ON public.order_items
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;
END $$;
