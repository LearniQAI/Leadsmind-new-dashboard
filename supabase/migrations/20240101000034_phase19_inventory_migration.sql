-- PHASE 19: AI ACCOUNTANT - SET 3: OPERATIONAL MODULES (INVENTORY & DATA)

-- 1. INVENTORY EXTENSIONS (FIFO / WEIGHTED AVERAGE)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS quantity_on_hand INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS costing_method TEXT DEFAULT 'fifo', -- 'fifo' or 'weighted_average'
ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT false;

-- 2. INVENTORY LOTS (Necessary for SARS-preferred FIFO costing)
CREATE TABLE IF NOT EXISTS public.inventory_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_bought INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    unit_cost DECIMAL(15, 2) NOT NULL,
    purchase_date TIMESTAMPTZ DEFAULT now(),
    reference TEXT, -- Supplier Invoice #
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. STOCK ADJUSTMENTS
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'restock', 'correction', 'damage', 'sale'
    quantity_change INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. MIGRATION & DATA IMPORT
CREATE TABLE IF NOT EXISTS public.migration_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_system TEXT NOT NULL, -- 'sage', 'xero', 'qbo', 'excel'
    status TEXT DEFAULT 'pending', -- 'pending', 'mapping', 'importing', 'completed', 'failed'
    mapping_config JSONB DEFAULT '{}'::jsonb,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. SECURITY (RLS)
ALTER TABLE public.inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for inventory_lots" ON public.inventory_lots
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for inventory_adjustments" ON public.inventory_adjustments
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for migration_jobs" ON public.migration_jobs
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 6. INDEXES
CREATE INDEX idx_inventory_product ON inventory_lots(product_id);
CREATE INDEX idx_inventory_remaining ON inventory_lots(quantity_remaining) WHERE quantity_remaining > 0;
CREATE INDEX idx_migration_workspace ON migration_jobs(workspace_id);

-- 7. TRIGGERS
CREATE TRIGGER update_migration_jobs_updated_at BEFORE UPDATE ON migration_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. FUNCTIONS
CREATE OR REPLACE FUNCTION public.increment_product_stock(pid UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.products
    SET quantity_on_hand = quantity_on_hand + amount,
        updated_at = now()
    WHERE id = pid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. AI ADVISOR ENGINE
CREATE TABLE public.accountant_ai_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'tax_deduction', 'compliance_warning', 'financial_health'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    status TEXT DEFAULT 'active', -- 'active', 'dismissed', 'resolved'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, title)
);

CREATE TABLE public.compliance_deadlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    deadline_date DATE NOT NULL,
    type TEXT NOT NULL, -- 'VAT201', 'IRP6', 'EMP201'
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.accountant_ai_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can manage their alerts" ON public.accountant_ai_alerts
    FOR ALL USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Workspace owners can manage their deadlines" ON public.compliance_deadlines
    FOR ALL USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

-- 10. BUSINESS STRATEGY & GOALS
CREATE TABLE public.business_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'revenue_target', 'hiring_plan', 'capital_purchase'
    title TEXT NOT NULL,
    target_value NUMERIC NOT NULL,
    current_value NUMERIC DEFAULT 0,
    deadline_date DATE,
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, title)
);

ALTER TABLE public.business_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can manage their goals" ON public.business_goals
    FOR ALL USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
