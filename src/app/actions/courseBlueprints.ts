'use server';

import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

/**
 * Seeds the 5 core automation templates directly to the user dashboard canvas.
 */
export async function seedCourseBlueprints(courseId: string) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace found' };

    const adminClient = createAdminClient();

    // Definitions of the 5 core blueprints
    const blueprints = [
      {
        workspace_id: workspaceId,
        name: "Free Enrolment Flow",
        trigger_type: "enrollment_created",
        trigger_config: {
          conditions: [
            { field: "payment_status", operator: "equals", value: "free" }
          ]
        },
        action_type: "send_email",
        action_config: {
          course_id: courseId,
          email_subject: "Welcome to {{course_name}}! (Free Access)",
          email_body: "Hello {{student_first_name}},\n\nWelcome to {{course_name}}! You have been granted free access.\n\nPortal: {{portal_url}}\n\nHappy learning!"
        },
        active: true
      },
      {
        workspace_id: workspaceId,
        name: "Paid Enrolment Flow",
        trigger_type: "enrollment_created",
        trigger_config: {
          conditions: [
            { field: "payment_status", operator: "equals", value: "paid" }
          ]
        },
        action_type: "add_tag",
        action_config: {
          course_id: courseId,
          tag_name: "lms-paid-student"
        },
        active: true
      },
      {
        workspace_id: workspaceId,
        name: "Partial Access Upgrade Sequence",
        trigger_type: "quiz_passed",
        trigger_config: {
          min_score: 80
        },
        action_type: "enroll_course", // maps to grant_full_access
        action_config: {
          course_id: courseId,
          access_type: "full"
        },
        active: true
      },
      {
        workspace_id: workspaceId,
        name: "Drip Unlock Notification",
        trigger_type: "module_completed",
        trigger_config: {},
        action_type: "send_whatsapp",
        action_config: {
          course_id: courseId,
          whatsapp_message: "Awesome job completing that module in {{course_name}}! The next one is unlocked and waiting for you. Log in here: {{portal_url}}"
        },
        active: true
      },
      {
        workspace_id: workspaceId,
        name: "Course Abandonment Recovery Sequence",
        trigger_type: "enrollment_created",
        trigger_config: {
          conditions: [
            { field: "payment_status", operator: "equals", value: "failed" }
          ]
        },
        action_type: "send_email",
        action_config: {
          course_id: courseId,
          delay_hours: 2,
          email_subject: "Complete your registration for {{course_name}}",
          email_body: "Hello {{student_first_name}},\n\nWe noticed your registration for {{course_name}} could not be completed. You can finish your enrollment here: {{portal_url}}.\n\nLet us know if you need any help!"
        },
        active: true
      }
    ];

    // Seed rules
    for (const blueprint of blueprints) {
      const { error } = await adminClient
        .from('lms_automation_rules')
        .insert({
          workspace_id: blueprint.workspace_id,
          // Blueprints are seeded from a specific course's Automations tab — scope them
          // to that course so they don't fire for every course in the workspace.
          course_id: courseId,
          name: blueprint.name,
          trigger_type: blueprint.trigger_type,
          trigger_config: blueprint.trigger_config,
          action_type: blueprint.action_type,
          action_config: blueprint.action_config,
          active: blueprint.active
        });

      if (error) {
        logger.error({ err: error, workspaceId, ruleName: blueprint.name }, 'course_blueprints.seed_rule.failed');
        throw error;
      }
    }

    return { success: true };
  } catch (err: any) {
    logger.error({ err, courseId }, 'course_blueprints.seed.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}

/**
 * Batch 4 (G7) — the default certificate-delivery rule chain:
 *   course_completed        -> assign_certificate       (issues the persisted certificate)
 *   certificate_issued      -> send_certificate_email   (the dedicated congratulatory email)
 *
 * Unlike `seedCourseBlueprints` above (which unconditionally inserts on every call — clicking
 * its button twice duplicates all 5 rules), this is IDEMPOTENT: it checks for an existing
 * `course_completed -> assign_certificate` rule scoped to this course first, and no-ops if one
 * is already there. That's what makes it safe to call automatically on every course creation
 * AND safe to re-trigger by hand on an existing course without ever duplicating the chain or
 * disturbing a rule an admin already customised (an admin who edited or deleted the seeded
 * `assign_certificate` rule keeps their own state — this only adds the chain when it detects
 * neither half of it exists yet under these exact trigger/action pairs).
 *
 * Not auth-gated itself (no 'use server' boundary requirement) — callers are: (1)
 * createCourseWithDomain, server-side, right after a course is created (real workspaceId
 * already resolved there), and (2) enableCertificateDelivery below, which IS auth-gated, for
 * the explicit "turn this on for an existing course" admin action.
 */
export async function seedCertificateDeliveryBlueprint(
  courseId: string,
  workspaceId: string,
  adminClient?: SupabaseClient,
): Promise<{ created: boolean }> {
  const db = adminClient ?? createAdminClient();

  const { data: existing } = await db
    .from('lms_automation_rules')
    .select('id')
    .eq('course_id', courseId)
    .eq('trigger_type', 'course_completed')
    .eq('action_type', 'assign_certificate')
    .maybeSingle();

  if (existing) {
    return { created: false };
  }

  const { error } = await db.from('lms_automation_rules').insert([
    {
      workspace_id: workspaceId,
      course_id: courseId,
      name: 'Certificate delivery — issue on completion',
      trigger_type: 'course_completed',
      trigger_config: {},
      action_type: 'assign_certificate',
      action_config: {},
      active: true,
    },
    {
      workspace_id: workspaceId,
      course_id: courseId,
      name: 'Certificate delivery — email on issue',
      trigger_type: 'certificate_issued',
      trigger_config: {},
      action_type: 'send_certificate_email',
      action_config: {},
      active: true,
    },
  ]);

  if (error) {
    logger.error({ err: error, courseId, workspaceId }, 'course_blueprints.seed_certificate_delivery.failed');
    throw error;
  }

  return { created: true };
}

/** Explicit, admin-triggered "turn on automatic certificate delivery" for an EXISTING course
 *  (new courses get it automatically from createCourseWithDomain). A real button in the
 *  Automations tab, not a silent backfill migration — consistent with this project's
 *  no-hidden-side-effects standard for anything that changes what a course does. */
export async function enableCertificateDelivery(courseId: string) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace found' };

    const result = await seedCertificateDeliveryBlueprint(courseId, workspaceId);
    return { success: true, created: result.created };
  } catch (err: any) {
    logger.error({ err, courseId }, 'course_blueprints.enable_certificate_delivery.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}
