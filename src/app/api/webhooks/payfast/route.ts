import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { publishEvent } from "@/lib/events/EventBus";
import crypto from 'crypto'
import { logRevenueToAccounting } from '@/lib/calendar/accountingHook';

function verifyPayFastSignature(
  payload: Record<string, string>,
  passphrase: string | null
): boolean {
  const params = Object.keys(payload)
    .filter(key => key !== 'signature')
    .sort()
    .map(key => `${key}=${encodeURIComponent(String(payload[key])).replace(/%20/g, '+')}`)
    .join('&')

  const strToHash = passphrase
    ? `${params}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : params

  const hash = crypto.createHash('md5').update(strToHash).digest('hex')
  return hash === payload.signature
}

/**
 * PayFast Webhook Receiver Route
 * Handles purchase notifications from PayFast payment processor.
 */
export async function POST(req: NextRequest) {
  try {
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

    // Signature verification (only if passphrase is configured)
    const passphrase = process.env.PAYFAST_PASSPHRASE || null
    if (payload.signature && passphrase) {
      const isValid = verifyPayFastSignature(payload, passphrase)
      if (!isValid) {
        console.warn('[PayFast Webhook] Invalid signature — rejecting')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // IP whitelist (production only)
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
      console.warn(`[PayFast Webhook] Rejected from IP: ${clientIP}`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log("[PayFast Webhook] Received payment notification:", payload);

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
      console.log(`[PayFast Webhook] Ignored non-COMPLETE status: ${payment_status}`);
      return NextResponse.json({ received: true, status: "ignored" });
    }

    const supabase = await createServerClient();

    // 1. Resolve Workspace ID
    const workspaceId = custom_str1 || process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID;
    if (!workspaceId) {
      console.error("[PayFast Webhook] Missing workspace_id");
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
      console.error("[PayFast Webhook] Could not resolve contact for email:", email_address);
      return NextResponse.json({ error: "Could not resolve contact" }, { status: 400 });
    }

    // ── INVOICE PAYMENT HANDLING ──────────────────────────────
    // When m_payment_id matches a LeadsMind invoice ID
    // OR custom_str4 = 'invoice'
    const paymentType = payload.custom_str4 || ''

    const { data: matchedInvoice } = await supabase
      .from('invoices')
      .select('id, workspace_id, status, total_amount, contact_id, invoice_number')
      .eq('id', m_payment_id)
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
        .eq('id', matchedInvoice.id)

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
        console.error('[PayFast Webhook] Failed to log revenue journal entries:', ledgerErr);
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
                console.error('[PayFast Webhook] Failed to send WhatsApp message:', err);
              });
            } catch (smsErr) {
              console.error('[PayFast Webhook] SMS integration failed:', smsErr);
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

      console.log(
        `[PayFast Webhook] Invoice ${matchedInvoice.id} marked as paid — R${payload.amount_gross}`
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

    return NextResponse.json({ success: true, processed: true });
  } catch (err: any) {
    console.error("[PayFast Webhook] Exception occurred:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
