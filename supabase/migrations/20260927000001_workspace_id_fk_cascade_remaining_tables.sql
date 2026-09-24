-- workspace_id foreign keys for the 59 remaining workspace-scoped tables that never had one.
--
-- 20260806000003 fixed contacts.workspace_id (its audit counted 62 tables with no FK protection) but no
-- other table. Confirmed live 2026-09-24: these 59 tables have a workspace_id column and NO foreign key to
-- workspaces at all (not NO ACTION, simply absent), so deleting a workspace leaves their rows behind
-- silently. That is how a WhatsApp platform_connections row holding a plaintext access token outlived its
-- test workspace. Real workspaces are deleted too (Settings > Delete workspace, plus the stray-workspace
-- cleanup in auth/callback and invitations), and each such delete left rows in these tables, including
-- platform_connections credentials, messages and conversations.
--
-- ON DELETE CASCADE, matching every sibling that already has the FK: the other 225 workspace FKs are
-- almost all CASCADE, including kyc_consent, kyc_documents, invoices, financial_documents,
-- retainer_ledger_entries, gdpr_requests and webhook_deliveries. No migration documents a reason for any
-- of these 59 to be FK-less.
--
-- 1. Orphans. 216 rows already point at workspaces that no longer exist (booking_slot_analytics 204,
--    lena_messages 5, lena_configs 3, notifications 2, email_queue 1, lena_conversations 1). No tenant can
--    reach them (RLS is per workspace), and the constraint cannot be added while they exist, so they are
--    deleted, the same way 20260806000003 removed its two orphaned contacts. Children are listed before
--    their parents so no dependent row blocks a parent delete. The delete runs for every table, so rows
--    orphaned between the audit and this migration are covered too.
-- 2. The FK, added only if absent, so the migration is safe to re-run.
-- 3. An index on workspace_id where no index leads with it (42 of the 59). Deleting a workspace makes
--    Postgres look up matching rows in every referencing table; without an index each lookup is a full scan.
-- 4. A self-check that fails the migration if any listed table still lacks the FK.

DO $$
DECLARE
  t text;
  n bigint;
  tables text[] := ARRAY[
    -- children before parents (see note 1)
    'lena_messages', 'lena_conversations', 'lena_knowledge_base', 'lena_configs', 'lena_agents',
    'notifications_sent', 'notifications',
    'module_quiz_attempts', 'module_quiz_questions', 'quiz_attempts', 'quiz_questions', 'lms_quizzes',
    'course_certificates', 'course_progress', 'course_lessons', 'course_modules',
    'booking_intake_responses', 'booking_intake_forms', 'booking_outcomes', 'booking_packages',
    'booking_slot_analytics', 'booking_waitlists', 'no_show_recoveries', 'round_robin_assignment',
    'affiliate_clicks', 'affiliate_commissions', 'affiliate_payouts', 'affiliates',
    'messages', 'conversations',
    'contact_activities', 'contact_notes', 'contact_tasks', 'contact_verifications',
    'kyc_checks', 'kyc_consent_records', 'kyc_risk_ratings',
    'lms_adaptive_rules', 'lms_adaptive_rules_v2', 'lms_ai_ingest_queue', 'lms_automation_rules',
    'lms_certificate_templates', 'lms_certificates', 'lms_delayed_actions', 'lms_expert_profiles',
    'lms_student_struggle_scores',
    'opportunities', 'pipeline_stages', 'pipelines',
    'appointments', 'credit_ledger', 'email_queue', 'lead_finder_searches', 'platform_connections',
    'podcast_shows', 'service_items', 'shipment_events', 'speakers', 'webhook_delivery_logs'
  ];
BEGIN
  IF array_length(tables, 1) <> 59 THEN
    RAISE EXCEPTION 'expected 59 tables, list has %', array_length(tables, 1);
  END IF;

  -- 1. orphans
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DELETE FROM public.%I x WHERE x.workspace_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = x.workspace_id)', t);
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE NOTICE 'deleted % orphaned rows from %', n, t; END IF;
  END LOOP;

  FOREACH t IN ARRAY tables LOOP
    -- 2. FK
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint k JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = ANY (k.conkey)
      WHERE k.contype = 'f' AND k.conrelid = format('public.%I', t)::regclass
        AND a.attname = 'workspace_id' AND k.confrelid = 'public.workspaces'::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE',
        t, t || '_workspace_id_fkey');
    END IF;

    -- 3. index
    IF NOT EXISTS (
      SELECT 1 FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
      WHERE i.indrelid = format('public.%I', t)::regclass AND a.attname = 'workspace_id'
    ) THEN
      EXECUTE format('CREATE INDEX %I ON public.%I (workspace_id)', 'idx_' || t || '_workspace_id', t);
    END IF;
  END LOOP;

  -- 4. self-check
  SELECT count(*) INTO n
  FROM unnest(tables) AS u(tbl)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint k JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = ANY (k.conkey)
    WHERE k.contype = 'f' AND k.conrelid = format('public.%I', u.tbl)::regclass
      AND a.attname = 'workspace_id' AND k.confrelid = 'public.workspaces'::regclass AND k.confdeltype = 'c'
  );
  IF n > 0 THEN RAISE EXCEPTION '% tables still lack a CASCADE workspace_id FK', n; END IF;
END $$;
