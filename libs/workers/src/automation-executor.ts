import { createClient } from '@supabase/supabase-js';
import { resolveWorkspaceTwilioCredentials } from '@/lib/twilio/resolveWorkspaceTwilioCredentials';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Main execution handler for LMS automation actions.
 */
export async function executeLMSAction(
  workspaceId: string,
  contactId: string,
  actionType: string,
  config: any
) {
  try {
    console.log(`[LMS Worker Executor] Executing action: ${actionType} for contact ${contactId}`);
    const courseId = config.courseId || config.course_id;

    switch (actionType) {
      // Access Handlers
      case 'grant_full_access':
      case 'enroll_course': {
        if (!courseId) {
          console.error('[LMS Worker Executor] courseId is required for grant_full_access');
          break;
        }
        const { data: existing } = await supabaseAdmin
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('contact_id', contactId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabaseAdmin
            .from('enrollments')
            .update({ access_type: 'full', active: true, status: 'active' })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin
            .from('enrollments')
            .insert({
              // enrollments has no workspace_id column (derived via course_id -> courses)
              contact_id: contactId,
              course_id: courseId,
              access_type: 'full',
              active: true,
              status: 'active',
              payment_status: 'free'
            });
          if (error) throw error;
        }
        break;
      }

      case 'grant_partial_access': {
        if (!courseId) {
          console.error('[LMS Worker Executor] courseId is required for grant_partial_access');
          break;
        }
        const { data: existing } = await supabaseAdmin
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('contact_id', contactId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabaseAdmin
            .from('enrollments')
            .update({ access_type: 'partial', active: true, status: 'active' })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin
            .from('enrollments')
            .insert({
              // enrollments has no workspace_id column (derived via course_id -> courses)
              contact_id: contactId,
              course_id: courseId,
              access_type: 'partial',
              active: true,
              status: 'active',
              payment_status: 'free'
            });
          if (error) throw error;
        }
        break;
      }

      case 'revoke_access':
      case 'revoke_course': {
        if (!courseId) {
          console.error('[LMS Worker Executor] courseId is required for revoke_access');
          break;
        }
        const { error } = await supabaseAdmin
          .from('enrollments')
          .update({ active: false, status: 'cancelled' })
          .eq('course_id', courseId)
          .eq('contact_id', contactId);
        if (error) throw error;
        break;
      }

      // Data Segmentation
      case 'add_tag': {
        const tagName = config.tag_name || 'lms-automation-tag';
        const { AutomationActions } = await import('@/lib/automation/actions_registry');
        await AutomationActions.apply_tag(workspaceId, contactId, { tag: tagName });
        break;
      }

      // Communication Channels
      case 'send_email': {
        const { sendEmail } = await import('@/lib/email');
        const { data: contact } = await supabaseAdmin
          .from('contacts')
          .select('email, first_name')
          .eq('id', contactId)
          .single();

        if (contact?.email) {
          await sendEmail({
            to: contact.email,
            subject: config.email_subject || 'LMS Notification',
            html: `<div style="font-family:sans-serif;padding:20px;color:#333;">${config.email_body || ''}</div>`
          });
        }
        break;
      }

      case 'send_whatsapp': {
        const { sendSMS } = await import('@/lib/sms');
        const { data: contact } = await supabaseAdmin
          .from('contacts')
          .select('phone')
          .eq('id', contactId)
          .single();

        const { data: workspace } = await supabaseAdmin
          .from('workspaces')
          .select('twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted, twilio_number')
          .eq('id', workspaceId)
          .single();

        if (contact?.phone && workspace?.twilio_number) {
          const creds = resolveWorkspaceTwilioCredentials(workspace);
          const cleanPhone = contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`;
          await sendSMS({
            to: `whatsapp:${cleanPhone}`,
            message: config.whatsapp_message || '',
            config: {
              ...creds,
              fromNumber: `whatsapp:${workspace.twilio_number}`
            }
          });
        }
        break;
      }

      case 'notify_instructor':
      case 'crm_alert': {
        const { data: admins } = await supabaseAdmin
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)
          .eq('role', 'admin');

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await supabaseAdmin.from('notifications').insert({
              workspace_id: workspaceId,
              user_id: admin.user_id,
              type: 'system',
              title: config.alert_title || 'Outbound CRM Alert',
              message: config.alert_message || `CRM alert triggered for contact: ${contactId}`,
              link: config.alert_link || '/contacts',
              read: false
            });
          }
        }
        break;
      }

      case 'enroll_bundle': {
        const bundleId = config.bundle_id || config.bundleId;
        if (!bundleId) {
          console.error('[LMS Worker Executor] bundle_id is required for enroll_bundle');
          break;
        }
        // Reuse the one real bundle-enrollment implementation (writes lms_bundle_enrollments
        // + a child enrollments row per course in the bundle, then publishes
        // student_enrolled_bundle). Do not duplicate that logic here.
        const { lms_enroll_bundle } = await import('@/lib/automation/lms_actions');
        await lms_enroll_bundle(workspaceId, contactId, {
          bundleId,
          child_privileges: config.child_privileges || {},
          duration_days: config.duration_days,
          welcome_email_enabled: config.welcome_email_enabled,
          welcome_whatsapp_enabled: config.welcome_whatsapp_enabled,
          email_subject: config.email_subject,
          email_body: config.email_body,
        });
        break;
      }

      case 'assign_certificate': {
        if (!courseId) {
          console.error('[LMS Worker Executor] courseId is required for assign_certificate');
          break;
        }
        // Reuse the single persisted, stable-id certificate path — one row per
        // (contact, course) in course_certificates, validation_id minted once. No second
        // creation path. The student's PDF download route reads this same row.
        const { ensureCourseCertificate } = await import('@/lib/lms/issueCertificate');
        const cert = await ensureCourseCertificate({ contactId, courseId, workspaceId });
        console.log(
          `[LMS Worker Executor] assign_certificate: ${cert.created ? 'issued' : 'already issued'} ${cert.validation_id} for ${contactId} / course ${courseId}`
        );
        // Chain the certificate_issued trigger only on a genuine first issue, so a
        // certificate_issued -> assign_certificate rule cannot loop.
        if (cert.created) {
          try {
            const { emitLMSEvent } = await import('../../core/src/events/lms-event-bus');
            await emitLMSEvent('certificate_issued', {
              workspaceId,
              contactId,
              courseId,
              metadata: { validationId: cert.validation_id, source: 'assign_certificate' },
            });
          } catch (evtErr) {
            console.error('[LMS Worker Executor] assign_certificate telemetry emit failed:', evtErr);
          }
        }
        break;
      }

      case 'grant_community': {
        // There is no per-contact "community access" gate in this codebase: forum/community
        // browsing (src/app/community/*) is gated purely by workspace membership
        // (check_workspace_access), and contacts.metadata.community_role — written by the
        // CRM engine's update_community_privilege — is read nowhere. The real, observable
        // effect available today is CRM segmentation: apply a 'community-access' tag (same
        // atomic RPC as the add_tag action) and stamp community_role so a future forum-ACL
        // feature has a signal to honour. This is NOT full forum gating — logged plainly.
        const { AutomationActions } = await import('@/lib/automation/actions_registry');
        await AutomationActions.apply_tag(workspaceId, contactId, {
          tag: config.tag_name || 'community-access',
        });
        // Stamp contacts.metadata.community_role, mirroring the CRM engine's
        // update_community_privilege (same JSONB field), so a future forum-ACL feature
        // has a real signal to read.
        const { data: cRow } = await supabaseAdmin
          .from('contacts')
          .select('metadata')
          .eq('id', contactId)
          .maybeSingle();
        await supabaseAdmin
          .from('contacts')
          .update({ metadata: { ...(cRow?.metadata || {}), community_role: config.level || 'member' } })
          .eq('id', contactId)
          .eq('workspace_id', workspaceId);
        console.log(
          `[LMS Worker Executor] grant_community: tagged ${contactId} 'community-access' (note: forum access itself is workspace-membership-gated; no per-contact ACL exists yet)`
        );
        break;
      }

      default:
        console.warn(`[LMS Worker Executor] Unhandled action type: ${actionType}`);
    }
  } catch (err) {
    console.error(`[LMS Worker Executor] Execution failed for ${actionType}:`, err);
    throw err;
  }
}
