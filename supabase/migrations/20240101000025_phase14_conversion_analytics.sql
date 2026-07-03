-- PHASE 14: CONVERSION ANALYTICS DASHBOARD

-- 1. View for Step-by-Step Funnel Performance
CREATE OR REPLACE VIEW public.vw_workflow_funnel_stats AS
SELECT 
    ws.workflow_id,
    ws.id AS step_id,
    ws.position,
    ws.type AS step_type,
    ws.config->>'label' AS label,
    COUNT(DISTINCT l.execution_id) AS reached_count,
    COUNT(DISTINCT CASE WHEN l.status = 'completed' THEN l.execution_id END) AS completed_count,
    COUNT(DISTINCT CASE WHEN l.status = 'failed' THEN l.execution_id END) AS failed_count,
    -- Drop-off is calculated as (Reached - Completed) / Reached
    CASE 
        WHEN COUNT(DISTINCT l.execution_id) > 0 
        THEN (CAST(COUNT(DISTINCT l.execution_id) - COUNT(DISTINCT CASE WHEN l.status = 'completed' THEN l.execution_id END) AS FLOAT) / COUNT(DISTINCT l.execution_id)) * 100
        ELSE 0 
    END AS drop_off_percentage
FROM 
    public.workflow_steps ws
LEFT JOIN 
    public.workflow_step_logs l ON ws.id = l.step_id
GROUP BY 
    ws.workflow_id, ws.id, ws.position, ws.type, ws.config->>'label'
ORDER BY 
    ws.workflow_id, ws.position;

-- 2. View for Workflow ROI & Revenue Attribution
-- Ensure the amount_paid column exists (Fixes potential missing column in older schemas)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

CREATE OR REPLACE VIEW public.vw_workflow_revenue_attribution AS
SELECT 
    w.id AS workflow_id,
    w.name AS workflow_name,
    COUNT(DISTINCT we.id) AS total_enrollments,
    COALESCE(SUM(inv.amount_paid), 0) AS total_revenue,
    CASE 
        WHEN COUNT(DISTINCT we.id) > 0 
        THEN COALESCE(SUM(inv.amount_paid), 0) / COUNT(DISTINCT we.id)
        ELSE 0 
    END AS revenue_per_enrollment
FROM 
    public.workflows w
LEFT JOIN 
    public.workflow_executions we ON w.id = we.workflow_id
LEFT JOIN 
    public.invoices inv ON we.contact_id = inv.contact_id AND inv.status = 'paid'
GROUP BY 
    w.id, w.name;

-- 3. Security (RLS) for Analytics Views
-- By default, views in PostgreSQL use the permissions of the owner.
-- To ensure workspace isolation, we should query these with a workspace filter or use SECURITY DEFINER functions.

COMMENT ON VIEW public.vw_workflow_funnel_stats IS 'Aggregates contact drop-off and completion rates per workflow step for funnel visualization';
COMMENT ON VIEW public.vw_workflow_revenue_attribution IS 'Tracks revenue generated from paid invoices attributed to contacts in workflows';
