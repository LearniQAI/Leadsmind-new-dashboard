import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { publishEvent } from "@/lib/events/EventBus";
import crypto from 'crypto'
import { logRevenueToAccounting } from '@/lib/calendar/accountingHook';
import { verifyPayFastSignature } from '@/lib/calendar/payfast';
import { logger } from '@/shared/logger';

/**
 * PayFast Webhook Receiver Route
 * Handles purchase notifications from PayFast payment processor.
 */
export async function POST(req: NextRequest) {
  try {
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    if (!passphrase) {
      throw new Error('[FATAL] PAYFAST_PASSPHRASE env var is not configured');
    }

    let payload: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = value;
      });
    } else {
      payload = await req.json();
    }

    // Signature verification — mandatory in every environment, before any contact/invoice/
    // enrollment logic runs. A missing or incorrect signature is always rejected; this is never
    // conditional on the payload happening to include a `signature` field.
    const isValid = verifyPayFastSignature(payload, passphrase)
    if (!isValid) {
      logger.warn({}, 'webhook.payfast.signature.invalid')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    // IP whitelist (production only — signature verification above is mandatory and sufficient
    // in every environment; this allowlist is additional defense-in-depth for production only,
    // deliberately not enforced elsewhere so local/staging testing against PayFast's sandbox
    // from non-allowlisted IPs remains possible)
    const payfastIPs = [
      '197.97.145.144',
      '196.33.227.224',
      '196.33.227.232',
      '41.74.179.194',
      '41.74.179.195',
    ]
    const clientIP = (
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '0.0.0.0'
    )
    if (process.env.NODE_ENV === 'production' && !payfastIPs.includes(clientIP)) {
      logger.warn({ clientIP }, 'webhook.payfast.ip_rejected')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    logger.info({ payload }, 'webhook.payfast.received');

    const {
      payment_status,
      email_address,
      m_payment_id,
      custom_str1, // workspace_id
      custom_str2, // contact_id
      custom_str3, // course_id
      item_name,
      amount_gross
    } = payload;

    // Check if the payment status is COMPLETE
    if (payment_status !== "COMPLETE") {
      logger.info({ paymentStatus: payment_status }, 'webhook.payfast.non_complete_ignored');
      return NextResponse.json({ received: true, status: "ignored" });
    }

    // Real PayFast server-to-server calls never carry a user session cookie, so this must be
    // the service-role client — the RLS-respecting client used here previously meant every
    // query/update below was silently filtered to nothing for genuine webhook calls, regardless
    // of signature verification. Access is still gated by signature verification above, never by
    // an ambient user session that doesn't exist for this caller.
    const supabase = createAdminClient();

    // 1. Resolve Workspace ID
    const workspaceId = custom_str1 || process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID;
    if (!workspaceId) {
      logger.error({}, 'webhook.payfast.workspace_id.missing');
      return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });
    }

    // 2. Resolve Contact ID
    let contactId = custom_str2;
    if (!contactId && email_address) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", email_address)
        .single();

      if (contact) {
        contactId = contact.id;
      } else {
        // Auto-create contact record
        const { data: newContact, error: contactErr } = await supabase
          .from("contacts")
          .insert({
            workspace_id: workspaceId,
            email: email_address,
            first_name: email_address.split("@")[0] || "Customer",
            last_name: "",
            source: "PayFast"
          })
          .select("id")
          .single();

        if (!contactErr && newContact) {
          contactId = newContact.id;
        }
      }
    }

    if (!contactId) {
      logger.error({ email: email_address, workspaceId }, 'webhook.payfast.contact_resolve.failed');
      return NextResponse.json({ error: "Could not resolve contact" }, { status: 400 });
    }

    // ── INVOICE PAYMENT HANDLING ──────────────────────────────
    // When m_payment_id matches a LeadsMind invoice ID
    // OR custom_str4 = 'invoice'
    const paymentType = payload.custom_str4 || ''

    const { data: matchedInvoice } = await supabase
      .from('invoices')
      .select('id, workspace_id, status, total_amount, contact_id, invoice_number')
      .eq("id", m_payment_id).eq("workspace_id", workspaceId)
      .maybeSingle()

    if (matchedInvoice && matchedInvoice.status !== 'paid') {
      const invoiceWorkspaceId = matchedInvoice.workspace_id || workspaceId

      // 1. Mark invoice as paid
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: 'payfast',
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchedInvoice.id).eq("workspace_id", workspaceId)

      // 2. Record double-entry revenue to accounting module
      try {
        await logRevenueToAccounting(
          matchedInvoice.id,
          parseFloat(payload.amount_gross || '0'),
          invoiceWorkspaceId,
          payload.pf_payment_id || m_payment_id,
          payload.amount_fee || '0'
        );
      } catch (ledgerErr) {
        logger.error({ err: ledgerErr, invoiceId: matchedInvoice.id }, 'webhook.payfast.revenue_ledger.failed');
      }

      // 4. Log contact activity
      if (matchedInvoice.contact_id) {
        await supabase
          .from('contact_activities')
          .insert({
            workspace_id: invoiceWorkspaceId,
            contact_id: matchedInvoice.contact_id,
            type: 'edit',
            description: `Invoice paid via PayFast — R${payload.amount_gross}`,
            metadata: {
              payfast_ref: payload.pf_payment_id,
              amount: payload.amount_gross,
              type: 'invoice_payment',
            },
          })
      }

      // 5. Send payment confirmation email to contact
      try {
        if (matchedInvoice.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('email, first_name, phone')
            .eq('id', matchedInvoice.contact_id)
            .single()
 
          if (contact?.email) {
            const { sendEmail } = await import('@/lib/email')
            await sendEmail({
              to: contact.email,
              subject: `Payment Confirmed — R${payload.amount_gross}`,
              html: `
                <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
                  <h2 style="color:#10b981;">Payment Received ✓</h2>
                  <p>Hi ${contact.first_name},</p>
                  <p>We have received your payment of <strong>R${payload.amount_gross}</strong>.</p>
                  <p><strong>Invoice:</strong> #${matchedInvoice.invoice_number || m_payment_id}</p>
                  <p><strong>Reference:</strong> ${payload.pf_payment_id || m_payment_id}</p>
                  <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-ZA')}</p>
                  <p>Thank you for your payment.</p>
                </div>
              `,
            }).catch(() => {})
          }

          if (contact?.phone) {
            try {
              const { sendSMS } = await import('@/lib/sms');
              const { data: ws } = await supabase
                .from('workspaces')
                .select('twilio_sid, twilio_token, twilio_number')
                .eq('id', invoiceWorkspaceId)
                .single();

              const from = ws?.twilio_number ? `whatsapp:${ws.twilio_number}` : undefined;
              const to = contact.phone.startsWith('whatsapp:') ? contact.phone : `whatsapp:${contact.phone}`;

              await sendSMS({
                to,
                message: `Payment Confirmed: We have received your payment of R${payload.amount_gross} for invoice #${matchedInvoice.invoice_number || m_payment_id}. Reference: ${payload.pf_payment_id || m_payment_id}. Thank you!`,
                config: ws?.twilio_sid ? {
                  accountSid: ws.twilio_sid,
                  authToken: ws.twilio_token,
                  fromNumber: from,
                } : undefined,
              }).catch((err) => {
                logger.error({ err, invoiceId: matchedInvoice.id }, 'webhook.payfast.whatsapp_send.failed');
              });
            } catch (smsErr) {
              logger.error({ err: smsErr, invoiceId: matchedInvoice.id }, 'webhook.payfast.sms_integration.failed');
            }
          }
        }
      } catch {}


      // 6. Fire outbound webhook event
      try {
        const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher')
        await dispatchWebhook(invoiceWorkspaceId, 'invoice.paid', {
          invoice: {
            id: matchedInvoice.id,
            number: matchedInvoice.invoice_number,
            amount: parseFloat(payload.amount_gross || '0'),
            currency: 'ZAR',
            paid_at: new Date().toISOString(),
            payment_method: 'payfast',
            payfast_ref: payload.pf_payment_id || null,
          },
        })
      } catch {}

      logger.info(
        { invoiceId: matchedInvoice.id, amount: payload.amount_gross },
        'webhook.payfast.invoice.paid'
      )
    }
    // ── END INVOICE PAYMENT HANDLING ─────────────────────────

    // 3. Resolve Course ID (if not explicitly passed, try to match by name or payment id)
    let courseId = custom_str3;
    if (!courseId && item_name) {
      const { data: course } = await supabase
        .from("courses")
        .select("id")
        .eq("workspace_id", workspaceId)
        .ilike("title", item_name)
        .limit(1)
        .maybeSingle();

      if (course) {
        courseId = course.id;
      }
    }

    // 4. Log the transaction/activity
    await supabase.from("contact_activities").insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      type: "edit",
      description: `Paid R${amount_gross || "0.00"} via PayFast for item: ${item_name || "Course"}`,
      metadata: { payfast_payload: payload, type: "payment" }
    });

    // 5. Emit Event Bus Trigger (19-point matrix trigger #19)
    await publishEvent(workspaceId, "payfast_payment_course", contactId, {
      courseId,
      paymentId: m_payment_id,
      amount: amount_gross,
      itemName: item_name
    });

    // Affiliate Commission Conversion
    try {
      if (contactId) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("referred_by_affiliate_id, referred_programme_id")
          .eq("id", contactId).eq("workspace_id", workspaceId)
          .single();

        if (contact?.referred_by_affiliate_id && contact?.referred_programme_id) {
          const { data: existingComm } = await supabase
            .from('affiliate_commissions')
            .select('id')
            .eq('source_type', 'order')
            .eq('source_id', payload.pf_payment_id || m_payment_id)
            .maybeSingle();

          if (!existingComm) {
            const ipHashStr = crypto.createHash('md5').update(clientIP).digest('hex');
            const { recordConversion } = await import('@/lib/affiliate/commission');
            await recordConversion({
              workspaceId: workspaceId,
              affiliateId: contact.referred_by_affiliate_id,
              programmeId: contact.referred_programme_id,
              sourceType: 'order',
              sourceId: payload.pf_payment_id || m_payment_id,
              contactId: contactId,
              amount: parseFloat(amount_gross || '0'),
              ipHash: ipHashStr
            });
          }
        }
      }
    } catch (affError) {
      logger.error({ err: affError, contactId }, 'webhook.payfast.affiliate_conversion.failed');
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (err: any) {
    logger.error({ err }, 'webhook.payfast.failed');
    return NextResponse.json({ error: 'PayFast webhook processing failed.' }, { status: 500 });
  }
}
