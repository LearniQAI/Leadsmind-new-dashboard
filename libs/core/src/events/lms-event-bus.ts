import { createClient } from '@supabase/supabase-js';
import { ruleMatchesCourse, quizScoreGatePasses } from './lms-rule-matching';

export { ruleMatchesCourse, quizScoreGatePasses } from './lms-rule-matching';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Dispatches an LMS event and evaluates active automation rules.
 */
export async function emitLMSEvent(
  eventType: string,
  payload: {
    workspaceId: string;
    contactId: string;
    courseId?: string;
    lessonId?: string;
    moduleId?: string;
    metadata?: any;
  }
) {
  console.log(`[LMS Event Bus] Emitted event: ${eventType}`, payload);

  try {
    // Query active lms_automation_rules matching this trigger_type
    const { data: allRules, error } = await supabaseAdmin
      .from('lms_automation_rules')
      .select('*')
      .eq('workspace_id', payload.workspaceId)
      .eq('trigger_type', eventType)
      .eq('active', true);

    if (error) {
      console.error('[LMS Event Bus] Failed to fetch active rules:', error);
      return;
    }

    // Course scoping: a rule with course_id set fires ONLY for events on that course;
    // a rule with course_id NULL is workspace-wide and fires for every course. If the
    // event itself carries no courseId, only workspace-wide rules can match.
    const rules = (allRules || []).filter((r: any) => ruleMatchesCourse(r, payload.courseId));

    if (rules.length === 0) {
      console.log(`[LMS Event Bus] No active rules matching event: ${eventType} (course: ${payload.courseId ?? 'n/a'})`);
      return;
    }

    for (const rule of rules) {
      console.log(`[LMS Event Bus] Processing rule: ${rule.name} (Action: ${rule.action_type})`);

      // Quiz score gate (see quizScoreGatePasses) — honour the builder's Minimum Score
      // against the real server-graded score the emitter passes in metadata.
      if (!quizScoreGatePasses(eventType, rule, payload.metadata?.score)) {
        console.log(`[LMS Event Bus] Skipping rule ${rule.name}: score ${payload.metadata?.score} fails min_score ${rule.trigger_config?.min_score} for ${eventType}.`);
        continue;
      }

      // Conditional Branching Rules (Payment Status == Paid vs Free, etc.)
      if (rule.trigger_config?.conditions && rule.trigger_config.conditions.length > 0) {
        let conditionsMet = true;
        for (const cond of rule.trigger_config.conditions) {
          const { field, operator, value } = cond;
          
          // Fetch enrollment details to evaluate payment status conditions
          if (field === 'payment_status' && payload.courseId) {
            const { data: enrollment } = await supabaseAdmin
              .from('enrollments')
              .select('payment_status')
              .eq('course_id', payload.courseId)
              .eq('contact_id', payload.contactId)
              .maybeSingle();

            const currentStatus = enrollment?.payment_status || 'free';
            if (operator === 'equals' && currentStatus !== value) conditionsMet = false;
            if (operator === 'not_equals' && currentStatus === value) conditionsMet = false;
          }
        }

        if (!conditionsMet) {
          console.log(`[LMS Event Bus] Skipping rule ${rule.name}: Conditions not met.`);
          continue;
        }
      }

      // Resolve delay wait time (if configured in action_config, e.g. delay_hours or delay_days)
      const delayHours = Number(rule.action_config?.delay_hours || 0);
      const delayDays = Number(rule.action_config?.delay_days || 0);
      const totalDelayMs = (delayHours * 60 * 60 * 1000) + (delayDays * 24 * 60 * 60 * 1000);

      // Event metadata (e.g. certificate_issued's { validationId }, quiz_passed's { score })
      // is spread into the action config so a downstream action (send_certificate_email,
      // Batch 4) can read what the EVENT carried, not just what the rule was configured with.
      // rule.action_config wins on any key collision — an explicit rule setting is never
      // silently overridden by event metadata.
      const actionConfig = {
        ...(payload.metadata || {}),
        ...rule.action_config,
        courseId: payload.courseId,
        lessonId: payload.lessonId,
        moduleId: payload.moduleId,
      };

      if (totalDelayMs > 0) {
        // Insert into delayed actions queue
        const runAt = new Date(Date.now() + totalDelayMs).toISOString();
        const { error: delayErr } = await supabaseAdmin
          .from('lms_delayed_actions')
          .insert({
            workspace_id: payload.workspaceId,
            contact_id: payload.contactId,
            action_type: rule.action_type,
            action_config: actionConfig,
            run_at: runAt,
            status: 'pending'
          });

        if (delayErr) {
          console.error('[LMS Event Bus] Failed to queue delayed action:', delayErr);
        } else {
          console.log(`[LMS Event Bus] Queued delayed action scheduled at: ${runAt}`);
        }
      } else {
        // Execute immediately
        await executeLMSAction(rule.workspace_id, payload.contactId, rule.action_type, actionConfig);
      }
    }
  } catch (err) {
    console.error('[LMS Event Bus] Unexpected execution error:', err);
  }
}

export async function executeLMSAction(workspaceId: string, contactId: string, actionType: string, config: any) {
  const { executeLMSAction: executeLMSActionImpl } = await import('../../../workers/src/automation-executor');
  return executeLMSActionImpl(workspaceId, contactId, actionType, config);
}
