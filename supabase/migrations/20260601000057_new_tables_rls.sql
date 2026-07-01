-- Migration: Enable RLS and add membership policies for domain, affiliate, and courier tables
-- File: supabase/migrations/20260619000000_new_tables_rls.sql

-- Enable RLS on all target tables
ALTER TABLE public.domain_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_poll_queue ENABLE ROW LEVEL SECURITY;

-- 1. Policy for domain_configurations
DROP POLICY IF EXISTS "Workspace member access on domain_configurations" ON public.domain_configurations;
CREATE POLICY "Workspace member access on domain_configurations" ON public.domain_configurations
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  );

-- 2. Policy for affiliate_programmes
DROP POLICY IF EXISTS "Workspace member access on affiliate_programmes" ON public.affiliate_programmes;
CREATE POLICY "Workspace member access on affiliate_programmes" ON public.affiliate_programmes
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  );

-- 3. Policy for affiliates
DROP POLICY IF EXISTS "Workspace member access on affiliates" ON public.affiliates;
CREATE POLICY "Workspace member access on affiliates" ON public.affiliates
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  );

-- 4. Policy for affiliate_clicks
DROP POLICY IF EXISTS "Workspace member access on affiliate_clicks" ON public.affiliate_clicks;
CREATE POLICY "Workspace member access on affiliate_clicks" ON public.affiliate_clicks
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  );

-- 5. Policy for affiliate_commissions
DROP POLICY IF EXISTS "Workspace member access on affiliate_commissions" ON public.affiliate_commissions;
CREATE POLICY "Workspace member access on affiliate_commissions" ON public.affiliate_commissions
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  );

-- 6. Policy for affiliate_payouts
DROP POLICY IF EXISTS "Workspace member access on affiliate_payouts" ON public.affiliate_payouts;
CREATE POLICY "Workspace member access on affiliate_payouts" ON public.affiliate_payouts
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  );

-- 7. Policy for courier_shipments
DROP POLICY IF EXISTS "Workspace member access on courier_shipments" ON public.courier_shipments;
CREATE POLICY "Workspace member access on courier_shipments" ON public.courier_shipments
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  );

-- 8. Policy for shipment_events
DROP POLICY IF EXISTS "Workspace member access on shipment_events" ON public.shipment_events;
CREATE POLICY "Workspace member access on shipment_events" ON public.shipment_events
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  );

-- 9. Policy for notifications_sent
DROP POLICY IF EXISTS "Workspace member access on notifications_sent" ON public.notifications_sent;
CREATE POLICY "Workspace member access on notifications_sent" ON public.notifications_sent
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  );

-- 10. Policy for courier_brand_settings
DROP POLICY IF EXISTS "Workspace member access on courier_brand_settings" ON public.courier_brand_settings;
CREATE POLICY "Workspace member access on courier_brand_settings" ON public.courier_brand_settings
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  );

-- 11. Policy for tracking_poll_queue (scopes through shipment_id)
DROP POLICY IF EXISTS "Workspace member access on tracking_poll_queue" ON public.tracking_poll_queue;
CREATE POLICY "Workspace member access on tracking_poll_queue" ON public.tracking_poll_queue
  FOR ALL TO authenticated
  USING (
    shipment_id IN (
      SELECT s.id FROM public.courier_shipments s
      JOIN public.workspace_members m ON m.workspace_id = s.workspace_id
      WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    shipment_id IN (
      SELECT s.id FROM public.courier_shipments s
      JOIN public.workspace_members m ON m.workspace_id = s.workspace_id
      WHERE m.user_id = auth.uid()
    )
  );
