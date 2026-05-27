import { NextRequest } from 'next/server';
import { corsResponse, corsError, getAdminSupabase } from '../../_lib/cors';

// Simple in-memory rate limit scaffold (per IP, per form, per minute)
// In production this would be backed by Redis or Upstash
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}

// POST /api/public/forms/[id]/submit
// Accepts public form submissions from the embed SDK
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return corsError('Form ID is required', 400);
  }

  // Rate limiting by IP + form combination
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimitKey = `${ip}:${id}`;

  if (!checkRateLimit(rateLimitKey)) {
    return corsError('Too many submissions. Please try again later.', 429);
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return corsError('Invalid request body', 400);
    }

    const { data: formData, workspace_id, steps_completed, attribution, is_returning, contact_token, transaction_id, transaction_status, attachments } = body;

    if (!formData || typeof formData !== 'object') {
      return corsError('Submission data is required', 400);
    }

    if (!workspace_id) {
      return corsError('Workspace ID is required', 400);
    }

    const supabase = getAdminSupabase();

    // 1. Verify the form exists, is published, and belongs to the claimed workspace
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, name, workspace_id, status, fields, config')
      .eq('id', id)
      .eq('status', 'published')
      .eq('workspace_id', workspace_id)
      .single();

    if (formError || !form) {
      return corsError('Form not found or not published', 404);
    }

    const userAgent = req.headers.get('user-agent') || '';
    const sourceUrl = req.headers.get('referer') || '';

    // 2. Identify Contact (Duplicate Detection Engine)
    let contactId: string | null = null;
    let existingContact: any = null;

    // Check token first
    if (contact_token) {
      const { verifyPrefillToken } = await import('@/lib/builder/tokens');
      const payload = await verifyPrefillToken(contact_token);
      if (payload && payload.workspaceId === workspace_id) {
        contactId = payload.contactId;
        const { data: c } = await supabase.from('contacts').select('*').eq('id', contactId).single();
        if (c) existingContact = c;
      }
    }

    // Extract common fields for matching/updating
    const emailField = (form.fields as any[]).find((f: any) => f.type === 'email');
    const phoneField = (form.fields as any[]).find((f: any) => f.type === 'phone');
    const nameField = (form.fields as any[]).find((f: any) => f.type === 'text' && f.label?.toLowerCase().includes('name') && !f.label?.toLowerCase().includes('company'));
    const companyField = (form.fields as any[]).find((f: any) => f.type === 'text' && f.label?.toLowerCase().includes('company'));

    const submissionEmail = emailField ? formData[emailField.id] : null;
    const submissionPhone = phoneField ? formData[phoneField.id] : null;
    const submissionName = nameField ? formData[nameField.id] : null;
    const submissionCompany = companyField ? formData[companyField.id] : null;

    let firstName = null;
    let lastName = null;
    if (submissionName) {
      const parts = submissionName.trim().split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || null;
    }

    // If no token, fallback to email match
    if (!existingContact && submissionEmail) {
      const { data: c } = await supabase.from('contacts')
        .select('*')
        .eq('workspace_id', workspace_id)
        .eq('email', submissionEmail)
        .single();
      if (c) {
        existingContact = c;
        contactId = c.id;
      }
    }

    // Parse attachments from formData if not explicitly passed
    let parsedAttachments = Array.isArray(attachments) ? attachments : [];
    if (parsedAttachments.length === 0) {
      const uploadFields = (form.fields as any[]).filter((f: any) => f.type === 'upload');
      const signatureFields = (form.fields as any[]).filter((f: any) => f.type === 'signature');
      
      for (const field of uploadFields) {
        if (Array.isArray(formData[field.id])) {
          parsedAttachments.push(...formData[field.id].map((f: any) => ({ ...f, fieldId: field.id })));
        }
      }
      for (const field of signatureFields) {
        if (formData[field.id]) {
          parsedAttachments.push({ type: 'signature', url: formData[field.id], fieldId: field.id });
        }
      }
    }

    // 3. Merge or Create CRM Contact
    if (existingContact) {
      // Safe merge: update only if new data is provided
      const updates: any = {};
      if (firstName && !existingContact.first_name) updates.first_name = firstName;
      if (lastName && !existingContact.last_name) updates.last_name = lastName;
      if (submissionPhone && !existingContact.phone) updates.phone = submissionPhone;
      if (submissionCompany && !existingContact.company) updates.company = submissionCompany;
      
      // Merge first-touch attribution if not already set on the contact
      const firstTouchSource = attribution?.first_touch_source;
      const firstTouchKeyword = attribution?.first_touch_keyword;
      const firstTouchPage = attribution?.first_touch_page;

      if (firstTouchSource && !existingContact.first_touch_source) updates.first_touch_source = firstTouchSource;
      if (firstTouchKeyword && !existingContact.first_touch_keyword) updates.first_touch_keyword = firstTouchKeyword;
      if (firstTouchPage && !existingContact.first_touch_page) updates.first_touch_page = firstTouchPage;

      // Merge attribution
      if (attribution && Object.keys(attribution).length > 0) {
        updates.form_attribution = { ...(existingContact.form_attribution || {}), ...attribution };
      }

      // POPIA consent parameter logging on update
      updates.consent_timestamp = new Date().toISOString();
      updates.consent_ip = ip;
      updates.consent_form_id = id;
      updates.processing_purpose_scope = form.name || 'Lead Submission';

      if (Object.keys(updates).length > 0) {
        const { data: updatedContact } = await supabase.from('contacts')
          .update(updates)
          .eq('id', existingContact.id)
          .select('id')
          .single();
        contactId = updatedContact?.id || contactId;
      }
    } else if (submissionEmail) {
      // Create new contact
      const firstTouchSource = attribution?.first_touch_source || null;
      const firstTouchKeyword = attribution?.first_touch_keyword || null;
      const firstTouchPage = attribution?.first_touch_page || null;

      const { data: newContact } = await supabase.from('contacts')
        .insert({
          workspace_id: workspace_id,
          email: submissionEmail,
          phone: submissionPhone || null,
          first_name: firstName,
          last_name: lastName,
          company: submissionCompany || null,
          source: 'form_submission',
          metadata: { form_id: id },
          form_attribution: attribution || {},
          first_touch_source: firstTouchSource,
          first_touch_keyword: firstTouchKeyword,
          first_touch_page: firstTouchPage,
          // POPIA consent parameter logging on creation
          consent_timestamp: new Date().toISOString(),
          consent_ip: ip,
          consent_form_id: id,
          processing_purpose_scope: form.name || 'Lead Submission'
        })
        .select('id')
        .single();
      if (newContact) contactId = newContact.id;
    }

    // 4. Insert the form submission record with tracking metadata
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .insert({
        workspace_id: form.workspace_id,
        form_id: id,
        data: formData,
        source_url: sourceUrl,
        source_type: 'embed',
        user_agent: userAgent,
        steps_completed: steps_completed || 1,
        attribution: attribution || {},
        is_returning: !!existingContact || is_returning,
        contact_id: contactId,
        attachments: parsedAttachments,
        transaction_id: transaction_id || null,
        transaction_status: transaction_status || (transaction_id ? 'processing' : 'pending')
      })
      .select('id')
      .single();

    if (submissionError) {
      console.error('[Public Submit] Submission error:', submissionError);
      return corsError(`Database error: ${submissionError.message || JSON.stringify(submissionError)}`, 500);
    }

    // Trigger workflow automations asynchronously
    try {
      const { TriggerDispatcher } = await import('@/lib/automations/TriggerDispatcher');
      TriggerDispatcher.dispatch('form_submitted', {
        formId: id,
        workspaceId: workspace_id,
        formName: form.name || 'Form',
        values: formData,
        completionPercentage: 100,
        attribution: attribution || {},
        isReturningContact: !!existingContact || is_returning,
        metadata: {
          userAgent,
          sourceUrl,
          transactionStatus: transaction_status || null,
        }
      });
    } catch (triggerErr) {
      console.error('[Public Submit] Failed to dispatch workflow trigger:', triggerErr);
    }

    return corsResponse({
      success: true,
      submission_id: submission.id,
      message: 'Form submitted successfully',
    });

  } catch (err: any) {
    console.error('[Public Submit] Unhandled error:', err);
    return corsError('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return corsResponse(null, 200);
}
