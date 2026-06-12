import { createClient } from '@supabase/supabase-js';

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
              workspace_id: workspaceId,
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
              workspace_id: workspaceId,
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
          .select('twilio_sid, twilio_token, twilio_number')
          .eq('id', workspaceId)
          .single();

        if (contact?.phone && workspace?.twilio_number) {
          const cleanPhone = contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`;
          await sendSMS({
            to: `whatsapp:${cleanPhone}`,
            message: config.whatsapp_message || '',
            config: {
              accountSid: workspace.twilio_sid,
              authToken: workspace.twilio_token,
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

      case 'grant_community': {
        console.log(`[LMS Worker Executor] Granting community access for ${contactId}`);
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
