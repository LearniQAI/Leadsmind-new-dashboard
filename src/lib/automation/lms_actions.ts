import { createServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

/**
 * Handles course enrollment with parametric configuration.
 */
export async function lms_enroll(workspaceId: string, contactId: string, config: any) {
  const { courseId, access_type = "full", duration_days, welcome_email_enabled, welcome_whatsapp_enabled } = config;
  if (!courseId) throw new Error("Missing courseId in configuration");

  const supabase = await createServerClient();

  // Fetch contact details
  const { data: contact } = await supabase
    .from("contacts")
    .select("email, first_name, phone")
    .eq("id", contactId)
    .single();

  if (!contact) throw new Error(`Contact ${contactId} not found`);

  // Calculate expiration time if duration_days is provided
  let expiresAt: string | null = null;
  if (duration_days && Number(duration_days) > 0) {
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + Number(duration_days));
    expiresAt = expiresDate.toISOString();
  }

  // Upsert enrollment
  const { error } = await supabase
    .from("enrollments")
    .upsert({
      course_id: courseId,
      contact_id: contactId,
      status: "active",
      access_type,
      expires_at: expiresAt,
      metadata: { enrolled_via: "automation", welcomed: welcome_email_enabled || welcome_whatsapp_enabled }
    }, { onConflict: "course_id,contact_id" });

  if (error) throw error;

  // Trigger event notification
  const { publishEvent } = await import("@/lib/events/EventBus");
  await publishEvent(workspaceId, "student_enrolled_course", contactId, { courseId, access_type });

  // Welcome Email Integration
  if (welcome_email_enabled && contact.email) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("resend_api_key, email_from_name, email_from_address")
      .eq("id", workspaceId)
      .single();

    await sendEmail({
      to: contact.email,
      subject: config.email_subject || "Welcome to the Course!",
      html: config.email_body || `<p>Hello ${contact.first_name || "Student"},</p><p>You have been enrolled in the course. Start learning now!</p>`,
      config: {
        apiKey: workspace?.resend_api_key,
        fromEmail: workspace?.email_from_address,
        fromName: workspace?.email_from_name,
      }
    } as any).catch(err => console.error("Failed to send welcome email:", err));
  }

  // Welcome WhatsApp Integration
  if (welcome_whatsapp_enabled && contact.phone) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("twilio_sid, twilio_token, twilio_number")
      .eq("id", workspaceId)
      .single();

    const cleanPhone = contact.phone.startsWith("+") ? contact.phone : `+${contact.phone}`;
    const to = `whatsapp:${cleanPhone}`;
    const from = `whatsapp:${workspace?.twilio_number || process.env.TWILIO_PHONE_NUMBER}`;
    const msgText = config.whatsapp_body || `Hi ${contact.first_name || "there"}, welcome to the course! You now have ${access_type} access.`;

    await sendSMS({
      to,
      message: msgText,
      config: {
        accountSid: workspace?.twilio_sid,
        authToken: workspace?.twilio_token,
        fromNumber: from,
      }
    }).catch(err => console.error("Failed to send welcome WhatsApp:", err));
  }
}

/**
 * Handles bundle enrollment containing child assets with customizable access mappings.
 */
export async function lms_enroll_bundle(workspaceId: string, contactId: string, config: any) {
  const { bundleId, child_privileges = {}, duration_days, welcome_email_enabled, welcome_whatsapp_enabled } = config;
  if (!bundleId) throw new Error("Missing bundleId in configuration");

  const supabase = await createServerClient();

  // Fetch bundle courses
  const { data: bundle } = await supabase
    .from("lms_bundles")
    .select("course_ids, name")
    .eq("id", bundleId)
    .single();

  if (!bundle) throw new Error(`Bundle ${bundleId} not found`);

  // Calculate expiration time if duration_days is provided
  let expiresAt: string | null = null;
  if (duration_days && Number(duration_days) > 0) {
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + Number(duration_days));
    expiresAt = expiresDate.toISOString();
  }

  // Upsert bundle enrollment
  const { error: bundleErr } = await supabase
    .from("lms_bundle_enrollments")
    .upsert({
      workspace_id: workspaceId,
      bundle_id: bundleId,
      contact_id: contactId,
      status: "active",
      expires_at: expiresAt,
      metadata: { child_privileges }
    }, { onConflict: "bundle_id,contact_id" });

  if (bundleErr) throw bundleErr;

  // Process child course privileges
  const courses: string[] = bundle.course_ids || [];
  for (const courseId of courses) {
    const courseAccessType = child_privileges[courseId] || "full";
    await lms_enroll(workspaceId, contactId, {
      courseId,
      access_type: courseAccessType,
      duration_days,
      welcome_email_enabled: false, // Prevent duplicate welcome emails per course
      welcome_whatsapp_enabled: false
    });
  }

  // Trigger event notification
  const { publishEvent } = await import("@/lib/events/EventBus");
  await publishEvent(workspaceId, "student_enrolled_bundle", contactId, { bundleId });

  // Optional global bundle welcome notification if email/whatsapp toggled
  const { data: contact } = await supabase
    .from("contacts")
    .select("email, first_name, phone")
    .eq("id", contactId)
    .single();

  if (contact) {
    if (welcome_email_enabled && contact.email) {
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("resend_api_key, email_from_name, email_from_address")
        .eq("id", workspaceId)
        .single();

      await sendEmail({
        to: contact.email,
        subject: config.email_subject || `Welcome to ${bundle.name}!`,
        html: config.email_body || `<p>Hello ${contact.first_name || "Student"},</p><p>You have been enrolled in the bundle <b>${bundle.name}</b>.</p>`,
        config: {
          apiKey: workspace?.resend_api_key,
          fromEmail: workspace?.email_from_address,
          fromName: workspace?.email_from_name,
        }
      } as any).catch(err => console.error("Failed to send welcome email:", err));
    }
  }
}

/**
 * Handles course or bundle access revocation with custom grace periods.
 */
export async function lms_revoke_access(workspaceId: string, contactId: string, config: any) {
  const { courseId, bundleId, grace_period_hours, send_alarm } = config;
  const supabase = await createServerClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("email, first_name, phone")
    .eq("id", contactId)
    .single();

  let gracePeriodExpiresAt: string | null = null;
  if (grace_period_hours && Number(grace_period_hours) > 0) {
    const graceDate = new Date();
    graceDate.setHours(graceDate.getHours() + Number(grace_period_hours));
    gracePeriodExpiresAt = graceDate.toISOString();
  }

  if (courseId) {
    if (gracePeriodExpiresAt) {
      await supabase
        .from("enrollments")
        .update({
          grace_period_expires_at: gracePeriodExpiresAt,
          status: "suspended",
          metadata: { revoked_via: "automation", status_reason: "grace_period" }
        })
        .eq("course_id", courseId)
        .eq("contact_id", contactId);
    } else {
      await supabase
        .from("enrollments")
        .update({ status: "revoked", grace_period_expires_at: null })
        .eq("course_id", courseId)
        .eq("contact_id", contactId);
    }

    const { publishEvent } = await import("@/lib/events/EventBus");
    await publishEvent(workspaceId, "course_revoked", contactId, { courseId });
  }

  if (bundleId) {
    if (gracePeriodExpiresAt) {
      await supabase
        .from("lms_bundle_enrollments")
        .update({
          grace_period_expires_at: gracePeriodExpiresAt,
          status: "suspended"
        })
        .eq("bundle_id", bundleId)
        .eq("contact_id", contactId);
    } else {
      await supabase
        .from("lms_bundle_enrollments")
        .update({ status: "revoked", grace_period_expires_at: null })
        .eq("bundle_id", bundleId)
        .eq("contact_id", contactId);

      // Revoke all child courses in the bundle
      const { data: bundle } = await supabase
        .from("lms_bundles")
        .select("course_ids")
        .eq("id", bundleId)
        .single();
      if (bundle?.course_ids) {
        for (const cId of bundle.course_ids) {
          await supabase
            .from("enrollments")
            .update({ status: "revoked", grace_period_expires_at: null })
            .eq("course_id", cId)
            .eq("contact_id", contactId);
        }
      }
    }
  }

  // Send expiration/revocation alarm warning
  if (send_alarm && contact) {
    const alarmMsg = config.alarm_message || `Important: Your access is expiring soon. Please contact support.`;
    
    if (contact.email) {
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("resend_api_key, email_from_name, email_from_address")
        .eq("id", workspaceId)
        .single();

      await sendEmail({
        to: contact.email,
        subject: "LMS Access Expiring Alert",
        html: `<p>Hello ${contact.first_name || "Student"},</p><p>${alarmMsg}</p>`,
        config: {
          apiKey: workspace?.resend_api_key,
          fromEmail: workspace?.email_from_address,
          fromName: workspace?.email_from_name,
        }
      } as any).catch(err => console.error("Alarm email failed:", err));
    }
  }
}

/**
 * Updates community privilege level (Member, Moderator, Admin).
 */
export async function update_community_privilege(workspaceId: string, contactId: string, config: any) {
  const { level = "member" } = config; // member, moderator, admin
  const supabase = await createServerClient();

  // Fetch current contact metadata
  const { data: contact } = await supabase
    .from("contacts")
    .select("metadata")
    .eq("id", contactId)
    .single();

  if (!contact) throw new Error("Contact not found");

  const newMetadata = {
    ...(contact.metadata || {}),
    community_role: level
  };

  const { error } = await supabase
    .from("contacts")
    .update({ metadata: newMetadata })
    .eq("id", contactId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;
}

/**
 * Structural integration: Twilio WhatsApp Template notification
 */
export async function send_whatsapp_template(workspaceId: string, contactId: string, config: any) {
  const { templateName, languageCode = "en", components = [] } = config;
  const supabase = await createServerClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("phone")
    .eq("id", contactId)
    .single();

  if (!contact?.phone) throw new Error("Contact has no phone number");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("twilio_sid, twilio_token, twilio_number")
    .eq("id", workspaceId)
    .single();

  const cleanPhone = contact.phone.startsWith("+") ? contact.phone : `+${contact.phone}`;
  
  // Custom Twilio WhatsApp template message payloads require sending the template binding string
  // Format is usually custom but here we pack it and pass to twilio API or mock handler
  const templateBody = `Template: ${templateName} [Lang: ${languageCode}] Components: ${JSON.stringify(components)}`;

  await sendSMS({
    to: `whatsapp:${cleanPhone}`,
    message: templateBody,
    config: {
      accountSid: workspace?.twilio_sid,
      authToken: workspace?.twilio_token,
      fromNumber: `whatsapp:${workspace?.twilio_number || process.env.TWILIO_PHONE_NUMBER}`,
    }
  });
}
