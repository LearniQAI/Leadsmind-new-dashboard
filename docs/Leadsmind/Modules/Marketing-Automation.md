---
type: module
---

# Marketing Automation

## Purpose

Workflow builder + execution engine, plus the marketing delivery channels it
drives: campaigns, email drip/sequences, bulk SMS, WhatsApp broadcasts and
chatbot, and contact segmentation. Triggers/actions are dispatched onto an
Inngest queue so they survive the originating serverless request.

## Key Files

- Automation UI: `src/app/automations` (`[id]`, `new`), `src/app/automation`
  (`history`), `src/app/api/automation/button-action/route.ts`.
- Execution: `src/lib/automation/actions_registry.ts` (27 runtime action
  handlers — send_email, send_sms, apply_tag/add_tag, create_task, lead_score,
  social_post, lms_enroll*, send_whatsapp*, move_to_stage, notify_team/slack,
  send_webhook, create_invoice/send_invoice, generate_ai_task, …),
  `src/lib/automation/lms_actions.ts`,
  `src/lib/automations/TriggerDispatcher.ts` (7 Inngest events: form_submitted,
  partial_abandoned, step_completed, payment_completed, payment_failed,
  form_viewed, recovery_link_opened), `src/lib/inngest/`, `src/app/api/inngest/`.
- Server actions: `automation.ts`, `automation_crud.ts`, `automation_editor.ts`,
  `automation-workspace.ts`, `marketing.ts`, `messaging.ts`, `bulk_sms.ts`,
  `email_sequences.ts`, `whatsapp_broadcast.ts`, `whatsapp_bot_rules.ts`,
  `segments.ts`.
- Channels: `src/app/campaigns`, `src/app/sequences`, `src/app/sms`,
  `src/app/whatsapp-broadcasts`, `src/app/segments`, `src/app/conversations`.
- Delivery libs: `src/lib/sms.ts`, `src/lib/twilio/`, `src/lib/meta/`
  (`MetaAdapter.ts`, `whatsappWindow.ts`, `subscribeWebhook.ts`),
  `src/lib/email/`, `src/lib/marketing/campaignMetrics.ts`,
  `src/lib/campaigns/`.

## API Routes / DB Tables

- Routes: `src/app/api/inngest/*`, `src/app/api/automation/button-action`,
  `src/app/api/cron/{abandonment-scanner,reengagement-loop,reminders,publish,
  quota-refill}`, `src/app/api/webhooks/{twilio,meta,email,resend}`,
  `src/app/api/settings/webhooks`, `src/app/api/v1/webhooks`.
- Tables: workflows / workflow steps / workflow executions / per-step logs;
  `webhook_endpoints` (+ `.label`), `webhook_delivery_logs`,
  `webhook_dead_letters`; campaign / sequence / broadcast tables;
  `20260822000001_campaign_dispatch_targeted_jobs.sql`,
  `20260822000004_cron_worker_locks.sql`,
  `20260902000000_lockdown_campaign_rpcs_and_atomic_total_sent.sql`,
  `20260823000002_unify_sms_whatsapp_opt_out.sql`.

## Known Issues

- **Dead type vocabulary:** `src/types/workflow.types.ts` (5 trigger + 9 action
  types) has zero import references anywhere in `src/` — superseded by
  `actions_registry.ts`. [[Milestone-2]] task 25: remove or reconnect.
- **Webhook delivery table mismatch (fixed):** `webhook_delivery_logs.webhook_id`
  FK was pointed at `workspace_webhooks`, making delivery logging impossible;
  repointed to `webhook_endpoints` (`20260725000004`). `workspace_webhooks` is
  marked deprecated via `COMMENT ON TABLE`, not dropped — manual data migration
  (`scripts/migrate-workspace-webhooks-to-webhook-endpoints.js`) then a
  follow-up `DROP TABLE` still pending (security review section B).
- Course-completion automation triggers, unreachable Automation Recipes, and the
  Workflow History / "Total Executions" counter were broken — [[Milestone-2]]
  tasks 21–24.
- Trigger-firing reliability ("N of M triggers actually fire in production")
  cannot be verified from source — needs live runs.
- `docs/automation-audit.md` / `automation-audit-artifact.html` — prior audit of
  this engine.
- Inbound webhook signature verification (Twilio, Meta) added in [[Milestone-1]]
  (tasks 8–9); see [[Communications-Hub]].

## Related Tasks

[[Milestone-1]] (Twilio/Meta webhook signature verification, settings-endpoint
hardening) · [[Milestone-2]] (Workflow Builder, invoice action, WhatsApp step,
recipes/history fixes, drip builder, segmentation, bulk SMS module, WhatsApp
chatbot builder) · [[Milestone-4]] (scheduled publishing worker, AI campaign
recommendations, AI ad/landing copy)
