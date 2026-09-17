-- Dead-code cleanup (CRM & Sales nav sweep, 2026-09-17): drops 16 tables/
-- views confirmed to have zero .from(...) reads or writes anywhere in the
-- application code (grepped, not inferred) and zero RPC references. All
-- were superseded by a live equivalent that IS in active use:
--   task_tags / task_tag_assignments        -> superseded by the unified
--                                              tags/tag_assignments system
--   workflow_failures                        -> superseded by
--                                              status='failed' rows on the
--                                              live workflow_executions
--   workflow_triggers / workflow_actions /
--   automation_triggers / automation_executions /
--   workflow_execution_logs                  -> superseded by
--                                              workflow_steps/workflow_edges/
--                                              workflow_executions/
--                                              workflow_step_logs (what
--                                              automation_crud.ts /
--                                              automation_editor.ts actually
--                                              use)
--   vw_workflow_funnel_stats /
--   vw_workflow_revenue_attribution          -> unread views over the above
--   territory_insights / territory_scores    -> superseded by lead-finder
--                                              result tables
--   opportunity_activity                     -> superseded by
--                                              contact_activities /
--                                              UnifiedActivityEngine
--   lead_capture                             -> unread; every "lead_capture"
--                                              code hit is an unrelated
--                                              config field/boolean name
--   contact_credits / contact_booking_credits -> unread
--
-- territory_scores is dropped with CASCADE: it's still referenced by a FK
-- from `market_density`, a table that is itself unread by any application
-- code (confirmed separately) but was not part of this approved deletion
-- batch. CASCADE here only drops that now-orphaned FK constraint on
-- market_density -- market_density itself, and all its data, is untouched.
-- Every other table below is dropped plain (no CASCADE) since the FK
-- survey confirmed no live table outside this batch references any of them.

DROP VIEW IF EXISTS public.vw_workflow_funnel_stats;
DROP VIEW IF EXISTS public.vw_workflow_revenue_attribution;

DROP TABLE IF EXISTS public.workflow_failures;
DROP TABLE IF EXISTS public.workflow_execution_logs;
DROP TABLE IF EXISTS public.workflow_triggers;
DROP TABLE IF EXISTS public.workflow_actions;
DROP TABLE IF EXISTS public.automation_executions;
DROP TABLE IF EXISTS public.automation_triggers;

DROP TABLE IF EXISTS public.task_tag_assignments;
DROP TABLE IF EXISTS public.task_tags;

DROP TABLE IF EXISTS public.opportunity_activity;
DROP TABLE IF EXISTS public.lead_capture;

DROP TABLE IF EXISTS public.contact_booking_credits;
DROP TABLE IF EXISTS public.contact_credits;

DROP TABLE IF EXISTS public.territory_insights;
DROP TABLE IF EXISTS public.territory_scores CASCADE;
