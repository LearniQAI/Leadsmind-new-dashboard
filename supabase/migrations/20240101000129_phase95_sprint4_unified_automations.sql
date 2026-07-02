-- Migration: Sprint 4 Unified Automations, Goal Tracking, Twilio WhatsApp, and SA Recipes

-- 1. Extend Workflows table with goal tracking rules
ALTER TABLE public.workflows 
    ADD COLUMN IF NOT EXISTS goal_rules JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Extend Contacts table with primary communication channel
ALTER TABLE public.contacts 
    ADD COLUMN IF NOT EXISTS primary_channel TEXT NOT NULL DEFAULT 'email';

-- 3. Programmatically seed South African recipes for all workspaces
DO $$
DECLARE
    ws_row RECORD;
    wf_id UUID;
BEGIN
    FOR ws_row IN SELECT id FROM public.workspaces LOOP
        -- A. Invoice Overdue Chase
        -- Check if it already exists for this workspace to prevent duplicates
        IF NOT EXISTS (SELECT 1 FROM public.workflows WHERE workspace_id = ws_row.id AND name = 'Invoice Overdue Chase') THEN
            INSERT INTO public.workflows (workspace_id, name, description, trigger_type, trigger_config, is_active, goal_rules)
            VALUES (
                ws_row.id, 
                'Invoice Overdue Chase', 
                'Polite cross-channel notifications transitioning to structured collection tasks.', 
                'invoice_overdue', 
                '{}'::jsonb, 
                true, 
                '[{"field": "invoice_paid", "operator": "equals", "value": true}]'::jsonb
            )
            RETURNING id INTO wf_id;

            -- Step 1: Wait 1 day (86400 seconds)
            INSERT INTO public.workflow_steps (workflow_id, workspace_id, position, type, config)
            VALUES (wf_id, ws_row.id, 1, 'wait', '{"delaySeconds": 86400}'::jsonb);

            -- Step 2: Send Polite Email Reminder
            INSERT INTO public.workflow_steps (workflow_id, workspace_id, position, type, config)
            VALUES (
                wf_id, 
                ws_row.id, 
                2, 
                'send_email', 
                jsonb_build_object(
                    'templateType', 'custom_followup',
                    'subject', 'Overdue Reminder: Invoice ZAR {{invoice_amount_zar}}',
                    'body', 'Hi {{first_name}}, this is a friendly reminder that invoice {{invoice_number}} for ZAR {{invoice_amount_zar}} is currently overdue. Let us know if you need any assistance.',
                    'backup_whatsapp_body', 'Hi {{first_name}}, this is a friendly reminder that invoice {{invoice_number}} for ZAR {{invoice_amount_zar}} is overdue. Please settle it at your earliest convenience.'
                )
            );

            -- Step 3: Branching Path (Stop if paid)
            INSERT INTO public.workflow_steps (workflow_id, workspace_id, position, type, config)
            VALUES (
                wf_id, 
                ws_row.id, 
                3, 
                'if_else', 
                '{
                    "conditions": [{"field": "invoice_paid", "operator": "equals", "value": true}],
                    "matchAction": "stop",
                    "fallbackAction": "continue"
                }'::jsonb
            );

            -- Step 4: Dispatch backup collections WhatsApp
            INSERT INTO public.workflow_steps (workflow_id, workspace_id, position, type, config)
            VALUES (
                wf_id, 
                ws_row.id, 
                4, 
                'send_whatsapp', 
                '{"body": "URGENT: ZAR {{invoice_amount_zar}} payment is outstanding. Please reply to confirm payment."}'::jsonb
            );

            -- Step 5: Create CRM Task
            INSERT INTO public.workflow_steps (workflow_id, workspace_id, position, type, config)
            VALUES (
                wf_id, 
                ws_row.id, 
                5, 
                'create_task', 
                '{
                    "title": "Call {{first_name}} - Overdue Invoice ZAR {{invoice_amount_zar}}",
                    "description": "Verify payment status for invoice {{invoice_number}}.",
                    "priority": "high"
                }'::jsonb
            );
        END IF;

        -- B. SARS Tax Calendar Reminders (EMP201)
        IF NOT EXISTS (SELECT 1 FROM public.workflows WHERE workspace_id = ws_row.id AND name = 'SARS Tax Calendar Reminders') THEN
            INSERT INTO public.workflows (workspace_id, name, description, trigger_type, trigger_config, is_active, goal_rules)
            VALUES (
                ws_row.id, 
                'SARS Tax Calendar Reminders', 
                'Automations that check the SA Tax Calendar and trigger action sequences ahead of EMP201 deadlines.', 
                'sars_tax_reminder', 
                '{}'::jsonb, 
                true, 
                '[]'::jsonb
            )
            RETURNING id INTO wf_id;

            -- Step 1: Wait 5 days
            INSERT INTO public.workflow_steps (workflow_id, workspace_id, position, type, config)
            VALUES (wf_id, ws_row.id, 1, 'wait', '{"delaySeconds": 432000}'::jsonb);

            -- Step 2: Send SARS reminder Email
            INSERT INTO public.workflow_steps (workflow_id, workspace_id, position, type, config)
            VALUES (
                wf_id, 
                ws_row.id, 
                2, 
                'send_email', 
                jsonb_build_object(
                    'templateType', 'notification',
                    'subject', 'SARS EMP201 Deadline Reminder',
                    'body', 'Hi team, the SARS EMP201 submission deadline is approaching. Please submit your monthly figures before the 7th.',
                    'backup_whatsapp_body', 'Reminder: The SARS EMP201 submission deadline is approaching. Please calculate and submit monthly payroll figures before the 7th.'
                )
            );
        END IF;

        -- C. LMS Course Recoveries
        IF NOT EXISTS (SELECT 1 FROM public.workflows WHERE workspace_id = ws_row.id AND name = 'LMS Course Recoveries') THEN
            INSERT INTO public.workflows (workspace_id, name, description, trigger_type, trigger_config, is_active, goal_rules)
            VALUES (
                ws_row.id, 
                'LMS Course Recoveries', 
                'Triggered immediately when quiz scores fall short.', 
                'lms_quiz_failed', 
                '{}'::jsonb, 
                true, 
                '[{"field": "passed_quiz", "operator": "equals", "value": true}]'::jsonb
            )
            RETURNING id INTO wf_id;

            -- Step 1: Send Recovery Email
            INSERT INTO public.workflow_steps (workflow_id, workspace_id, position, type, config)
            VALUES (
                wf_id, 
                ws_row.id, 
                1, 
                'send_email', 
                jsonb_build_object(
                    'templateType', 'recovery',
                    'subject', 'Quiz Recovery: Keep going, {{first_name}}!',
                    'body', 'Hi {{first_name}}, we noticed you fell short on the recent quiz. Don''t worry! Here is a link to review the material and try again: {{recovery_link}}',
                    'backup_whatsapp_body', 'Hi {{first_name}}, we noticed you fell short on the recent quiz. You can review the material and try again here: {{recovery_link}}'
                )
            );

            -- Step 2: Create CRM Task
            INSERT INTO public.workflow_steps (workflow_id, workspace_id, position, type, config)
            VALUES (
                wf_id, 
                ws_row.id, 
                2, 
                'create_task', 
                '{
                    "title": "Tutor Check-in: {{first_name}}",
                    "description": "Follow up with student who failed the recent quiz.",
                    "priority": "normal"
                }'::jsonb
            );
        END IF;

    END LOOP;
END $$;
