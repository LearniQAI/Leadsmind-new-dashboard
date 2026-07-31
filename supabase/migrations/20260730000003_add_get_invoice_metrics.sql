-- Adds get_invoice_metrics, called from
-- src/app/actions/analytics/invoices.ts's getInvoiceAnalytics(). This RPC
-- was never authored (confirmed via live pg_proc introspection); the
-- caller already has a complete, correct manual-aggregate JS fallback, so
-- this is a DB-side performance optimization, not a live-bug fix --
-- nothing currently calls getInvoiceAnalytics() from the UI. Logic below
-- mirrors that fallback exactly (see analytics/invoices.ts lines 37-51).
CREATE OR REPLACE FUNCTION public.get_invoice_metrics(
  target_workspace_id UUID
)
RETURNS TABLE(
  total_collected NUMERIC,
  total_overdue NUMERIC,
  bad_debt_total NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    COALESCE((
      SELECT SUM(i.total_amount)
      FROM public.invoices i
      WHERE i.workspace_id = target_workspace_id
        AND i.status = 'paid'
    ), 0) AS total_collected,
    COALESCE((
      SELECT SUM(i.total_amount)
      FROM public.invoices i
      WHERE i.workspace_id = target_workspace_id
        AND i.status NOT IN ('paid', 'void')
        AND i.due_date IS NOT NULL
        AND i.due_date < now()
    ), 0) AS total_overdue,
    COALESCE((
      SELECT SUM(w.amount_written_off)
      FROM public.invoice_write_offs w
      WHERE w.workspace_id = target_workspace_id
    ), 0) AS bad_debt_total;
$$;

COMMENT ON FUNCTION public.get_invoice_metrics(UUID) IS
  'Workspace-scoped invoice metrics (collected/overdue/bad-debt totals). Logic must stay in sync with the JS fallback in src/app/actions/analytics/invoices.ts.';
