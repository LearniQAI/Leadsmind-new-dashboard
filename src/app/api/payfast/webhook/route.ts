import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyPayFastSignature } from '@/lib/calendar/payfast';
import { parseISO, addMinutes } from 'date-fns';
import { logRevenueToAccounting } from '@/lib/calendar/accountingHook';
import { createSupportTicket } from '@/lib/calendar/crossConnect';
import { sendBookingConfirmation } from '@/lib/calendar/notifications';
import { logger } from '@/shared/logger';

export async function POST(req: NextRequest) {
  try {
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    if (!passphrase) {
      throw new Error('[FATAL] PAYFAST_PASSPHRASE env var is not configured');
    }

    // 1. Parse PayFast Form Data
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    logger.info({ payload }, 'payfast_webhook.itn.received');

    // 2. Signature Validation — mandatory in every environment, before any lease/appointment/
    // invoice logic runs. A missing or incorrect signature is always rejected.
    const isValid = verifyPayFastSignature(payload, passphrase);
    if (!isValid) {
      logger.warn({}, 'payfast_webhook.signature.invalid');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const paymentStatus = payload.payment_status;
    const leaseId = payload.m_payment_id;

    if (paymentStatus === 'COMPLETE' && leaseId) {
      const supabase = createAdminClient();

      // 3. Retrieve Lease Hold
      const { data: lease } = await supabase
        .from('booking_leases')
        .select('*')
        .eq('id', leaseId)
        .maybeSingle();

      if (!lease || lease.status !== 'holding') {
        logger.warn({ leaseId }, 'payfast_webhook.lease.not_found_or_processed');
        return new NextResponse('OK', { status: 200 });
      }

      // 4. Update Lease status to confirmed
      await supabase
        .from('booking_leases')
        .update({ status: 'confirmed' })
        .eq('id', lease.id);

      // Fetch Calendar and Contact info
      const { data: calendar } = await supabase
        .from('booking_calendars')
        .select('*')
        .eq('id', lease.calendar_id)
        .single();

      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', lease.contact_id)
        .single();

      if (calendar && contact) {
        // 5. Create final appointment
        const startTime = parseISO(lease.slot_time);
        const endTime = addMinutes(startTime, calendar.slot_duration || 30);

        const { data: appointment } = await supabase
          .from('appointments')
          .insert({
            workspace_id: lease.workspace_id,
            calendar_id: lease.calendar_id,
            contact_id: lease.contact_id,
            title: `Paid Meeting: ${calendar.name} with ${contact.first_name} ${contact.last_name}`,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'scheduled',
            metadata: {
              payfast_payment_id: payload.pf_payment_id,
              lease_id: lease.id,
              amount_paid: payload.amount_gross,
              paid_online: true,
            },
          })
          .select()
          .single();

        if (appointment) {
          // Generate internal meet links if needed
          if (calendar.meeting_mode === 'internal_meet' || (calendar.meeting_mode === 'custom_link' && !calendar.custom_link)) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const internalLink = `${baseUrl}/meet/${appointment.id}`;
            await supabase
              .from('appointments')
              .update({ meeting_link: internalLink, meeting_mode: 'internal_meet' })
              .eq('id', appointment.id);
          } else if (calendar.custom_link) {
            await supabase
              .from('appointments')
              .update({ meeting_link: calendar.custom_link })
              .eq('id', appointment.id);
          }

          // 6. Cross-Module Invoicing Integration
          const price = parseFloat(payload.amount_gross || '0');
          const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;

          // Create Invoices Row
          const { data: invoice } = await supabase
            .from('invoices')
            .insert({
              workspace_id: lease.workspace_id,
              contact_id: lease.contact_id,
              amount_due: price,
              amount_paid: price,
              subtotal: price,
              tax_total: 0.00,
              discount_total: 0.00,
              total_amount: price,
              invoice_number: invoiceNumber,
              currency: 'ZAR',
              status: 'paid',
              due_date: new Date().toISOString(),
              notes: `Paid consultation checkout for slot ${lease.slot_time}`,
            })
            .select()
            .single();

          if (invoice) {
            // Create Invoice Line Items
            await supabase
              .from('invoice_items')
              .insert({
                workspace_id: lease.workspace_id,
                invoice_id: invoice.id,
                description: `Paid Consultation: ${calendar.name} (${calendar.slot_duration} Minutes)`,
                quantity: 1,
                unit_price: price,
                total_amount: price,
              });

            // Log ledger activities to CRM
            await supabase
              .from('contact_activities')
              .insert({
                workspace_id: lease.workspace_id,
                contact_id: lease.contact_id,
                type: 'invoice',
                description: `Receipt generated for invoice ${invoiceNumber} - ZAR ${price}`,
                metadata: {
                  invoice_id: invoice.id,
                  invoice_number: invoiceNumber,
                  amount: price,
                  payment_ref: payload.pf_payment_id,
                },
              });

            // Log double-entry revenue to accounting module
            try {
              await logRevenueToAccounting(
                invoice.id,
                price,
                lease.workspace_id,
                payload.pf_payment_id || payload.m_payment_id,
                payload.amount_fee || '0'
              );
            } catch (ledgerErr) {
              logger.error({ err: ledgerErr }, 'payfast_webhook.revenue_journal.failed');
            }
          }

          // 7. Audit Ledger Action
          await supabase
            .from('meet_audit_trails')
            .insert({
              workspace_id: lease.workspace_id,
              actor_id: lease.contact_id, // contact is actor here
              action: 'status_change',
              entity_type: 'booking',
              entity_id: appointment.id,
              new_state: {
                payment_status: 'complete',
                amount: price,
                invoice_number: invoiceNumber,
              },
            });

          // 8. Real booking confirmation email (previously this only logged
          // "receipt.notified" and never actually sent anything — see
          // calendar.md Part B / the corresponding fix in public.ts's free
          // booking path). WhatsApp receipts remain out of scope — no
          // WhatsApp sending integration exists anywhere in this codebase to
          // reuse, so not fabricated here.
          try {
            await sendBookingConfirmation(appointment.id, { reason: 'booked' });
          } catch (notifyErr) {
            logger.error({ err: notifyErr, appointmentId: appointment.id }, 'payfast_webhook.confirmation_email.failed');
          }

          // Auto-create Support Ticket if support calendar
          try {
            await createSupportTicket(appointment.id);
          } catch (supportErr) {
            logger.error({ err: supportErr }, 'payfast_webhook.support_ticket.failed');
          }
        }
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    logger.error({ err: error }, 'payfast_webhook.processing.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
