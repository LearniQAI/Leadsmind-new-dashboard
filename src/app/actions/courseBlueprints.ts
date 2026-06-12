'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

/**
 * Seeds the 5 core automation templates directly to the user dashboard canvas.
 */
export async function seedCourseBlueprints(courseId: string) {
  try {
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
          name: blueprint.name,
          trigger_type: blueprint.trigger_type,
          trigger_config: blueprint.trigger_config,
          action_type: blueprint.action_type,
          action_config: blueprint.action_config,
          active: blueprint.active
        });

      if (error) {
        console.error(`[Seed Blueprints] Failed seeding rule: ${blueprint.name}`, error);
        throw error;
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Seed Blueprints] Error seeding blueprints:', err);
    return { error: err.message };
  }
}
