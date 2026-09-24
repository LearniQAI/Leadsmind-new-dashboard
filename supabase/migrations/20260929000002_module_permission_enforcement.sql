-- Module permissions: real database enforcement.
--
-- Until now workspace_members.permissions was read ONLY by client code (sidebar filtering and
-- the client-side DefaultWrapper gate). No RLS policy and no DB function referenced it, so a
-- restricted member could read/write every module's tables directly through PostgREST, and
-- every server action on the user-scoped client did the same.
--
-- The permission model also changes from the old, drifted per-feature keys
-- (contacts/pipelines/invoices/business/automation/...) to one key per sidebar section:
--   dashboard, crm, marketing, social, finance, commerce, calendar, hr, learning,
--   communication, settings
-- (src/lib/permissions/modules.ts + the `module` field in src/data/dashboard-nav.ts).
--
-- Design:
--   * public.module_denied_workspaces(modules[]) returns the workspaces where the CALLER is a
--     member whose role/permissions include NONE of the given modules. Owners/admins and the
--     workspace owner are never denied; hr/payroll roles imply 'hr'.
--   * Each module-owned table gets ONE RESTRICTIVE policy "module_access" TO authenticated.
--     RESTRICTIVE policies are AND-ed with the existing permissive ones, so this can only
--     narrow access, never widen it.
--   * Non-members are never denied by it (students, portal clients, affiliates, public
--     visitors keep exactly their current access); anon and service_role are unaffected.
--   * The denied-workspace list is computed once per statement (scalar subquery → InitPlan),
--     not per row.
--   * Tables that other modules write to as a side effect (logs, queues, analytics, trigger
--     targets) get a SELECT-only restriction, so a permitted action in module A never starts
--     failing because a trigger touches module B's log table. Reads stay gated.

-- 1. Legacy key expansion (mirrors LEGACY_PERMISSION_MAP in src/lib/permissions/modules.ts).
-- "marketing" and "commerce" are BOTH old and new keys with narrower new meanings (old
-- marketing also covered Social; old commerce also covered Finance). They're widened only
-- by the one-time backfill below (p_backfill = true); at runtime a stored "marketing" means
-- the new Marketing module only.
CREATE OR REPLACE FUNCTION public.expand_module_permissions(p_permissions text[], p_backfill boolean DEFAULT false)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(array_agg(DISTINCT k ORDER BY k), '{}'::text[])
  FROM (
    SELECT unnest(
      CASE
        WHEN p = 'contacts'   THEN ARRAY['crm','communication']
        WHEN p = 'pipelines'  THEN ARRAY['crm']
        WHEN p = 'invoices'   THEN ARRAY['crm','finance']
        WHEN p = 'automation' THEN ARRAY['crm']
        WHEN p = 'business'   THEN ARRAY['learning']
        WHEN p = 'marketing' AND p_backfill THEN ARRAY['marketing','social']
        WHEN p = 'commerce'  AND p_backfill THEN ARRAY['commerce','finance']
        ELSE ARRAY[p]
      END
    ) AS k
    FROM unnest(coalesce(p_permissions, '{}'::text[]) || ARRAY['dashboard']) AS p
  ) s
  WHERE k IN ('dashboard','crm','marketing','social','finance','commerce','calendar','hr',
              'learning','communication','settings');
$$;

-- 2. Backfill: rewrite stored legacy keys to module keys (members + pending invitations),
-- preserving every page each old key used to reach.
UPDATE public.workspace_members
   SET permissions = public.expand_module_permissions(permissions, true)
 WHERE permissions IS DISTINCT FROM public.expand_module_permissions(permissions, true);

UPDATE public.workspace_invitations
   SET permissions = public.expand_module_permissions(permissions, true)
 WHERE permissions IS DISTINCT FROM public.expand_module_permissions(permissions, true);

-- 3. The access helper.
CREATE OR REPLACE FUNCTION public.module_denied_workspaces(p_modules text[])
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(array_agg(m.workspace_id), '{}'::uuid[])
  FROM public.workspace_members m
  WHERE m.user_id = auth.uid()
    AND coalesce(m.role, '') NOT IN ('owner', 'admin')
    AND NOT EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = m.workspace_id AND w.owner_id = auth.uid()
    )
    AND NOT (public.expand_module_permissions(m.permissions) && p_modules)
    AND NOT (m.role IN ('hr', 'payroll') AND 'hr' = ANY (p_modules));
$$;

REVOKE ALL ON FUNCTION public.module_denied_workspaces(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.module_denied_workspaces(text[]) TO authenticated, service_role;

-- 4. Table → modules map. mode 'all' = reads and writes gated; 'select' = reads gated only.
CREATE TEMP TABLE _module_tables (tbl text, modules text[], mode text) ON COMMIT DROP;

INSERT INTO _module_tables (tbl, modules, mode) VALUES
  -- Customer records: shared by every customer-facing module. Blocked for members whose only
  -- modules are dashboard / social / hr / settings.
  ('contacts',               '{crm,marketing,communication,calendar,finance,commerce,learning}', 'all'),
  ('contact_notes',          '{crm,marketing,communication,calendar,finance,commerce,learning}', 'all'),
  ('contact_touchpoints',    '{crm,marketing,communication,calendar,finance,commerce,learning}', 'all'),
  ('contact_verifications',  '{crm,marketing,communication,calendar,finance,commerce,learning}', 'all'),
  ('contact_activities',     '{crm,marketing,communication,calendar,finance,commerce,learning}', 'select'),
  ('tags',                   '{crm,marketing,communication,calendar,finance,commerce,learning}', 'all'),
  ('tag_assignments',        '{crm,marketing,communication,calendar,finance,commerce,learning}', 'all'),
  ('tag_categories',         '{crm,marketing,communication,calendar,finance,commerce,learning}', 'all'),
  ('user_tag_favorites',     '{crm,marketing,communication,calendar,finance,commerce,learning}', 'all'),
  ('tag_history',            '{crm,marketing,communication,calendar,finance,commerce,learning}', 'select'),

  -- CRM & Sales
  ('pipelines',              '{crm}', 'all'),
  ('pipeline_stages',        '{crm}', 'all'),
  ('quotes',                 '{crm}', 'all'),
  ('lead_finder_searches',   '{crm}', 'all'),
  ('lead_finder_email_scrape_stats', '{crm}', 'select'),
  ('crm_companies',          '{crm}', 'all'),
  ('crm_contacts',           '{crm}', 'all'),
  ('crm_opportunities',      '{crm}', 'all'),
  ('crm_activities',         '{crm}', 'select'),
  ('crm_notifications',      '{crm}', 'select'),
  ('projects',               '{crm}', 'all'),
  ('project_tasks',          '{crm}', 'all'),
  ('tasks',                  '{crm}', 'all'),
  ('task_attachments',       '{crm}', 'all'),
  ('task_reminders',         '{crm}', 'select'),
  ('contact_tasks',          '{crm}', 'all'),
  ('overdue_escalations',    '{crm}', 'select'),
  ('entity_merge_candidates','{crm}', 'all'),
  ('automation_workflows',   '{crm}', 'all'),
  ('automation_logs',        '{crm}', 'select'),
  -- Workflow engine is shared by /automations (CRM) and /forms/[id]/automations (Marketing);
  -- appointment-outcome triggers (Calendar) write executions.
  ('workflows',              '{crm,marketing}', 'all'),
  ('workflow_steps',         '{crm,marketing}', 'all'),
  ('workflow_edges',         '{crm,marketing}', 'all'),
  ('workflow_executions',    '{crm,marketing,calendar}', 'select'),
  ('workflow_step_logs',     '{crm,marketing}', 'select'),
  ('workflow_enrollment_queue','{crm,marketing}', 'select'),
  -- opportunities is written by appointment (Calendar) and KYC (Finance) triggers.
  ('opportunities',          '{crm,calendar,finance}', 'all'),

  -- Marketing
  ('email_campaigns',        '{marketing}', 'all'),
  ('campaign_stats',         '{marketing}', 'select'),
  ('campaign_recommendations','{marketing}', 'select'),
  ('campaign_test_send_events','{marketing}', 'select'),
  ('segments',               '{marketing}', 'all'),
  ('bulk_sms_campaigns',     '{marketing}', 'all'),
  ('whatsapp_broadcast_campaigns','{marketing}', 'all'),
  ('forms',                  '{marketing}', 'all'),
  ('form_variants',          '{marketing}', 'all'),
  ('form_collaborators',     '{marketing}', 'all'),
  ('form_submissions',       '{marketing}', 'select'),
  ('form_analytics_aggregates','{marketing}', 'select'),
  ('funnels',                '{marketing}', 'all'),
  ('funnel_orders',          '{marketing,commerce}', 'select'),
  ('pages',                  '{marketing}', 'all'),
  ('page_versions',          '{marketing}', 'all'),
  ('page_submissions',       '{marketing}', 'select'),
  ('websites',               '{marketing}', 'all'),
  ('builder_form_submissions','{marketing}', 'select'),
  ('ad_campaigns',           '{marketing}', 'all'),
  ('ad_copy_generations',    '{marketing}', 'all'),
  ('landing_page_copy_generations','{marketing}', 'all'),
  ('video_script_generations','{marketing}', 'all'),
  ('content_studio_documents','{marketing}', 'all'),
  ('content_grammar_checks', '{marketing}', 'all'),
  ('content_plagiarism_checks','{marketing}', 'all'),
  ('content_seo_checks',     '{marketing}', 'all'),
  ('reputation_campaigns',   '{marketing}', 'all'),
  ('reputation_requests',    '{marketing}', 'all'),
  ('reputation_reviews',     '{marketing}', 'all'),
  ('reputation_settings',    '{marketing}', 'all'),
  ('review_requests',        '{marketing}', 'all'),
  ('blog_posts',             '{marketing}', 'all'),
  ('blog_categories',        '{marketing}', 'all'),
  ('blog_comments',          '{marketing}', 'select'),
  ('blog_import_jobs',       '{marketing}', 'all'),
  ('blog_post_versions',     '{marketing}', 'all'),
  ('blog_settings',          '{marketing}', 'all'),
  ('blog_social_imports',    '{marketing}', 'all'),
  ('seo_projects',           '{marketing}', 'all'),

  -- Social
  ('social_accounts',        '{social}', 'all'),
  ('social_posts',           '{social}', 'all'),
  ('social_comments',        '{social}', 'all'),
  ('social_engagement_metrics','{social}', 'select'),
  ('social_post_analytics',  '{social}', 'select'),

  -- Finance & Accounting
  ('invoices',               '{finance}', 'all'),
  ('invoice_items',          '{finance}', 'all'),
  ('invoice_attachments',    '{finance}', 'all'),
  ('invoice_custom_fields',  '{finance}', 'all'),
  ('invoice_custom_field_values','{finance}', 'all'),
  ('invoice_manual_payments','{finance}', 'all'),
  ('invoice_settings',       '{finance}', 'all'),
  ('invoice_write_offs',     '{finance}', 'all'),
  ('invoice_delivery_queue', '{finance}', 'select'),
  ('recurring_invoices',     '{finance}', 'all'),
  ('credit_notes',           '{finance}', 'all'),
  ('retainers',              '{finance}', 'all'),
  ('retainer_ledger_entries','{finance}', 'all'),
  ('revenue_forecasts',      '{finance}', 'all'),
  ('accounting_transactions','{finance}', 'all'),
  ('accountant_ai_alerts',   '{finance}', 'select'),
  ('accountant_onboarding',  '{finance}', 'all'),
  ('bank_connections',       '{finance}', 'all'),
  ('chart_of_accounts',      '{finance}', 'all'),
  ('journal_entries',        '{finance}', 'all'),
  ('expenses',               '{finance}', 'all'),
  ('financial_documents',    '{finance}', 'all'),
  ('document_receipts',      '{finance}', 'all'),
  ('provisional_tax_records','{finance}', 'all'),
  ('director_loans',         '{finance}', 'all'),
  ('business_loans',         '{finance}', 'all'),
  ('home_office_setup',      '{finance}', 'all'),
  ('compliance_deadlines',   '{finance}', 'all'),
  ('str_reports',            '{finance}', 'all'),
  ('kyc_checks',             '{finance}', 'all'),
  ('kyc_documents',          '{finance}', 'all'),
  ('kyc_risk_ratings',       '{finance}', 'all'),
  ('kyc_consent',            '{finance}', 'all'),
  ('kyc_consent_records',    '{finance}', 'all'),
  ('beneficial_owners',      '{finance}', 'all'),
  ('source_of_funds_declarations','{finance}', 'all'),
  ('identity_verifications', '{finance}', 'all'),
  ('refunds',                '{finance,commerce}', 'all'),

  -- Commerce & Ops
  ('products',               '{commerce,finance,crm,marketing}', 'all'),
  ('price_lists',            '{commerce,finance,crm}', 'all'),
  ('orders',                 '{commerce}', 'all'),
  ('order_items',            '{commerce}', 'all'),
  ('inventory_items',        '{commerce}', 'all'),
  ('inventory_adjustments',  '{commerce}', 'all'),
  ('inventory_lots',         '{commerce}', 'all'),
  ('courier_shipments',      '{commerce}', 'all'),
  ('shipment_events',        '{commerce}', 'all'),
  ('courier_brand_settings', '{commerce}', 'all'),
  ('affiliates',             '{commerce}', 'all'),
  ('affiliate_programmes',   '{commerce}', 'all'),
  ('affiliate_commissions',  '{commerce}', 'all'),
  ('affiliate_payouts',      '{commerce}', 'all'),

  -- Calendar & Meetings (appointments also feed the CRM contact timeline)
  ('appointments',           '{calendar,crm}', 'all'),
  ('booking_calendars',      '{calendar}', 'all'),
  ('booking_intake_forms',   '{calendar}', 'all'),
  ('booking_intake_responses','{calendar}', 'select'),
  ('booking_outcomes',       '{calendar}', 'all'),
  ('booking_packages',       '{calendar}', 'all'),
  ('booking_waitlists',      '{calendar,crm}', 'select'),
  ('booking_slot_analytics', '{calendar,crm}', 'select'),
  ('host_availability_profiles','{calendar}', 'all'),
  ('no_show_recoveries',     '{calendar,crm}', 'select'),
  ('round_robin_assignment', '{calendar}', 'all'),
  ('recurring_series',       '{calendar}', 'all'),
  ('resources',              '{calendar}', 'all'),
  ('webinar_registrations',  '{calendar}', 'select'),

  -- HR & Payroll (time_entries is also CRM project time)
  ('employees',              '{hr}', 'all'),
  ('employee_documents',     '{hr}', 'all'),
  ('contractors',            '{hr}', 'all'),
  ('payroll_runs',           '{hr}', 'all'),
  ('payslips',               '{hr}', 'all'),
  ('leave_requests',         '{hr}', 'all'),
  ('schedules',              '{hr}', 'all'),
  ('terminations',           '{hr}', 'all'),
  ('warnings',               '{hr}', 'all'),
  ('time_entries',           '{hr,crm}', 'all'),

  -- Courses (students are not workspace members, so they are never affected)
  ('courses',                '{learning}', 'all'),
  ('course_categories',      '{learning}', 'all'),
  ('course_certificates',    '{learning}', 'all'),
  ('course_cohorts',         '{learning}', 'all'),
  ('course_modules',         '{learning}', 'all'),
  ('course_lessons',         '{learning}', 'all'),
  ('course_content_chunks',  '{learning}', 'select'),
  ('course_progress',        '{learning}', 'select'),
  ('course_qa_interactions', '{learning}', 'select'),
  ('lesson_summaries',       '{learning}', 'select'),
  ('lms_adaptive_rules',     '{learning}', 'all'),
  ('lms_adaptive_rules_v2',  '{learning}', 'all'),
  ('lms_automation_rules',   '{learning}', 'all'),
  ('lms_bundles',            '{learning}', 'all'),
  ('lms_bundle_enrollments', '{learning}', 'select'),
  ('lms_certificate_templates','{learning}', 'all'),
  ('lms_certificates',       '{learning}', 'select'),
  ('lms_expert_profiles',    '{learning}', 'all'),
  ('lms_quizzes',            '{learning}', 'all'),
  ('lms_assignment_submissions','{learning}', 'select'),
  ('lms_student_struggle_scores','{learning}', 'select'),
  ('lms_ai_ingest_queue',    '{learning}', 'select'),
  ('lms_delayed_actions',    '{learning}', 'select'),
  ('module_quiz_questions',  '{learning}', 'all'),
  ('module_quiz_attempts',   '{learning}', 'select'),
  ('quiz_questions',         '{learning}', 'all'),
  ('quiz_attempts',          '{learning}', 'select'),
  ('podcast_shows',          '{learning}', 'all'),
  ('video_assets',           '{learning}', 'all'),
  ('forum_posts',            '{learning}', 'select'),

  -- Communication (the CRM contact timeline shows conversations and calls)
  ('conversations',          '{communication,crm}', 'all'),
  ('messages',               '{communication,crm}', 'all'),
  ('call_logs',              '{communication,crm}', 'select'),
  ('quick_replies',          '{communication}', 'all'),
  ('whatsapp_bot_rules',     '{communication}', 'all'),

  -- Settings (credentials / developer surface only; provider & integration config is read
  -- by every module and is left to its existing admin-scoped policies)
  ('api_keys',               '{settings}', 'all'),
  ('workspace_api_keys',     '{settings}', 'all'),
  ('webhook_endpoints',      '{settings}', 'all'),
  ('workspace_webhooks',     '{settings}', 'all'),
  ('oauth_clients',          '{settings}', 'all'),
  ('webhook_subscriptions',  '{settings}', 'select'),
  ('webhook_deliveries',     '{settings}', 'select'),
  ('webhook_delivery_logs',  '{settings}', 'select');

-- 5. Apply. Fails loudly (rather than silently skipping) if a mapped table is missing, lacks
-- workspace_id, or doesn't have RLS enabled — a restrictive policy on a non-RLS table would
-- be decorative, which is exactly the bug being fixed.
DO $$
DECLARE
  r record;
  v_expr text;
BEGIN
  FOR r IN SELECT * FROM _module_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = 'workspace_id'
    ) THEN
      RAISE EXCEPTION 'module_access: public.% missing or has no workspace_id', r.tbl;
    END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I', r.tbl)::regclass) THEN
      RAISE EXCEPTION 'module_access: public.% does not have RLS enabled', r.tbl;
    END IF;

    v_expr := format(
      'NOT coalesce(workspace_id = ANY ((SELECT public.module_denied_workspaces(%L::text[]))::uuid[]), false)',
      r.modules
    );

    EXECUTE format('DROP POLICY IF EXISTS module_access ON public.%I', r.tbl);
    IF r.mode = 'all' THEN
      EXECUTE format(
        'CREATE POLICY module_access ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
        r.tbl, v_expr, v_expr
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY module_access ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (%s)',
        r.tbl, v_expr
      );
    END IF;
  END LOOP;
END $$;
