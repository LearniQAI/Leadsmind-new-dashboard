'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { publishEvent } from '@/lib/events/EventBus';

interface CreateWebinarRegistrationInput {
  funnelId: string;
  stepPath: string;
  firstName: string;
  lastName: string;
  email: string;
  sessionTitle: string;
  sessionDateTime: string; // ISO string, configured by the funnel owner in the widget's own props
  durationMinutes: number;
}

// Capture-only scope (signed off): registration captures name/email + the fixed
// session date/time the funnel owner configured, creates a contact + a
// registration record, and joins a REAL internal Jitsi room (appointments
// .meeting_mode='internal_meet', the already-working /meet/[id] mechanism) shared
// by every registrant for this step's session — not a fake Zoom/Google Meet link.
// One funnel_step = one session = one shared appointments row, lazily created on
// the first registrant. Public/unauthenticated route — same security pattern as
// createFunnelOrder (admin client, never trust caller-supplied ids beyond lookup).
export async function createWebinarRegistration(input: CreateWebinarRegistrationInput) {
  try {
    const { funnelId, stepPath, firstName, lastName, email, sessionTitle, sessionDateTime, durationMinutes } = input;
    if (!funnelId || !stepPath || !email || !sessionDateTime) {
      return { success: false, error: 'Missing required registration details' };
    }

    const supabase = createAdminClient();

    // 1. Resolve trusted context: the funnel step matching this exact funnel + path.
    const { data: funnelStep, error: stepError } = await supabase
      .from('funnel_steps')
      .select('id, funnel_id, order, config, funnel:funnels(workspace_id, subdomain, workspace:workspaces(slug))')
      .eq('funnel_id', funnelId)
      .eq('path_name', stepPath)
      .single();

    if (stepError || !funnelStep) {
      return { success: false, error: 'Invalid funnel step' };
    }

    const funnelInfo = Array.isArray(funnelStep.funnel) ? funnelStep.funnel[0] : funnelStep.funnel;
    const workspaceId = funnelInfo?.workspace_id;
    if (!workspaceId) {
      return { success: false, error: 'Invalid funnel' };
    }
    const funnelStepId = funnelStep.id;

    // 2. Resolve or create the contact (same shape as handlePageFormSubmission).
    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          workspace_id: workspaceId,
          email,
          first_name: firstName || '',
          last_name: lastName || '',
          source: 'Webinar Registration',
        })
        .select('id')
        .single();

      if (contactError) throw contactError;
      contactId = newContact.id;
    }

    // 3. Find or lazily create the shared session appointment — every registrant
    // for this step gets the same appointment id, so they all land in the same
    // Jitsi room. calendar_id/contact_id are both nullable (confirmed against
    // the live schema) and deliberately left unset here: this isn't a 1:1
    // consultation booking, so there's no single "owner" contact to assign it to.
    const { data: existingRegistration } = await supabase
      .from('webinar_registrations')
      .select('appointment_id')
      .eq('funnel_step_id', funnelStepId)
      .limit(1)
      .maybeSingle();

    let appointmentId = existingRegistration?.appointment_id;
    if (!appointmentId) {
      const startTime = new Date(sessionDateTime);
      const endTime = new Date(startTime.getTime() + (durationMinutes || 60) * 60 * 1000);

      const { data: appointment, error: apptError } = await supabase
        .from('appointments')
        .insert({
          workspace_id: workspaceId,
          title: sessionTitle || 'Webinar Session',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          meeting_mode: 'internal_meet',
          status: 'scheduled',
          metadata: { funnel_step_id: funnelStepId, type: 'webinar_session' },
        })
        .select('id')
        .single();

      if (apptError) throw apptError;
      appointmentId = appointment.id;
    }

    // 4. Record the registration.
    const { data: registration, error: regError } = await supabase
      .from('webinar_registrations')
      .insert({
        workspace_id: workspaceId,
        funnel_id: funnelId,
        funnel_step_id: funnelStepId,
        contact_id: contactId,
        appointment_id: appointmentId,
        status: 'registered',
      })
      .select('id')
      .single();

    if (regError) throw regError;

    // 5. Finally wire the dead live_session_booked trigger for real — it was
    // registered in EVENT_TRIGGERS but nothing ever published it (confirmed in
    // the Phase 3 audit). Non-blocking; a failure here must never fail the
    // registration itself.
    if (contactId) {
      publishEvent(workspaceId, 'live_session_booked', contactId, {
        funnelStepId,
        appointmentId,
        sessionTitle,
        sessionDateTime,
      }).catch((err) => {
        logger.error({ err, registrationId: registration.id }, 'webinar_registration.publish_event.failed');
      });
    }

    // 6. Resolve next step (on_success_step_id, falling back to order+1 — same
    // resolution the PayFast webhook uses for order_form/upsell/downsell).
    let nextStepId: string | null = (funnelStep.config as any)?.on_success_step_id || null;
    if (!nextStepId) {
      const { data: siblingSteps } = await supabase
        .from('funnel_steps')
        .select('id, order')
        .eq('funnel_id', funnelId);
      nextStepId = siblingSteps?.find((s) => s.order === funnelStep.order + 1)?.id || null;
    }

    let nextStepUrl: string | null = null;
    const workspaceInfo = Array.isArray(funnelInfo?.workspace) ? funnelInfo?.workspace[0] : funnelInfo?.workspace;
    if (nextStepId && workspaceInfo?.slug && funnelInfo?.subdomain) {
      const { data: nextStep } = await supabase
        .from('funnel_steps')
        .select('path_name')
        .eq('id', nextStepId)
        .single();
      const path = nextStep?.path_name === '/' ? '' : nextStep?.path_name || '';
      nextStepUrl = `/p/${workspaceInfo.slug}/${funnelInfo.subdomain}${path}?registration=${registration.id}`;
    }

    return { success: true, registrationId: registration.id, joinUrl: `/meet/${appointmentId}`, nextStepUrl };
  } catch (err: any) {
    logger.error({ err }, 'webinar_registration.create.failed');
    return { success: false, error: 'Failed to register' };
  }
}

// Public, unauthenticated read — used by the Webinar Thank-you/Broadcast page
// to show the registrant's session details and join link.
export async function getWebinarRegistration(registrationId: string) {
  try {
    if (!registrationId) return { success: false, error: 'Missing registration id' };
    const supabase = createAdminClient();

    const { data: registration, error } = await supabase
      .from('webinar_registrations')
      .select('id, appointment:appointments(id, title, start_time, end_time), contact:contacts(first_name, email)')
      .eq('id', registrationId)
      .single();

    if (error || !registration) return { success: false, error: 'Registration not found' };

    const appointment = Array.isArray(registration.appointment) ? registration.appointment[0] : registration.appointment;
    const contact = Array.isArray(registration.contact) ? registration.contact[0] : registration.contact;

    return {
      success: true,
      sessionTitle: appointment?.title || 'Webinar Session',
      sessionDateTime: appointment?.start_time || null,
      joinUrl: appointment?.id ? `/meet/${appointment.id}` : null,
      firstName: contact?.first_name || null,
    };
  } catch (err: any) {
    logger.error({ err }, 'webinar_registration.get.failed');
    return { success: false, error: 'Failed to load registration' };
  }
}
