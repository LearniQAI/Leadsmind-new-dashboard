'use server';

import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { AppError, NotFoundError, ValidationError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

// Same role tier as every other finance-sensitive action in this codebase (Investec bank
// connections, integration credentials, Stripe Connect) — admin/owner only.
const ALLOWED_REFUND_ROLES = ['admin', 'owner'];

export interface RefundResult {
  refundId: string;
  recordOnly: boolean;
  gateway: 'stripe' | 'payfast';
  amount: number;
}

// Server Action errors forward their thrown message to the client verbatim (unlike route
// handlers) — AppError subclasses already carry client-safe messages by design, anything else
// must be rethrown as a generic message instead of leaking internal (Stripe/PayFast/DB) details.
function rethrowSafe(err: unknown, logEvent: string, context?: Record<string, unknown>): never {
  logger.error({ err, ...context }, logEvent);
  if (err instanceof AppError) throw err;
  throw new Error('Unable to process refund. Please try again.');
}

/**
 * Refunds a paid invoice. If the invoice has a real Stripe payment_intent on record (captured
 * at payment time — see the webhook fix in Task 18), issues a real stripe.refunds.create() call.
 * Otherwise (PayFast invoices, or a historical Stripe invoice paid before payment_intent capture
 * existed) this is a record-only action: it updates LeadsMind's own status/audit trail but does
 * not move any money — the caller is told via `recordOnly: true` so the UI can label it correctly
 * rather than implying a real refund happened.
 */
export async function refundInvoice(invoiceId: string, reason: string, amount?: number): Promise<RefundResult> {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(ALLOWED_REFUND_ROLES);
    const supabase = createAdminClient();

    const { data: invoice, error: fetchErr } = await supabase
      .from('invoices')
      .select('id, workspace_id, status, total_amount, amount_paid, stripe_payment_intent_id')
      .eq('id', invoiceId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!invoice) throw new NotFoundError('Invoice');
    if (invoice.status !== 'paid') {
      throw new ValidationError(`Cannot refund an invoice with status "${invoice.status}" — only paid invoices can be refunded.`);
    }

    const refundAmount = amount ?? invoice.total_amount ?? invoice.amount_paid;
    if (!refundAmount || refundAmount <= 0) {
      throw new ValidationError('Refund amount must be greater than zero.');
    }

    let gateway: 'stripe' | 'payfast' = 'payfast';
    let recordOnly = true;
    let gatewayRefundId: string | null = null;

    if (invoice.stripe_payment_intent_id) {
      gateway = 'stripe';
      try {
        const refund = await stripe.refunds.create({
          payment_intent: invoice.stripe_payment_intent_id,
          amount: Math.round(refundAmount * 100),
          reason: 'requested_by_customer',
        });
        gatewayRefundId = refund.id;
        recordOnly = false;
      } catch (stripeErr) {
        rethrowSafe(stripeErr, 'refunds.invoice.stripe_api.failed', { invoiceId });
      }
    }
    // No stripe_payment_intent_id on record: either a PayFast invoice (no public refund API for
    // standard SA merchants) or a historical Stripe payment predating payment_intent capture.
    // Either way, real money movement — if any is owed — happens outside LeadsMind (PayFast
    // merchant dashboard, or Stripe dashboard using the customer/charge lookup manually). This
    // action only records that a refund was approved and flips LeadsMind's own status.

    const { error: updateErr } = await supabase
      .from('invoices')
      .update({ status: 'refunded', updated_at: new Date().toISOString() })
      .eq('id', invoiceId);
    if (updateErr) throw updateErr;

    const { data: refundRow, error: insertErr } = await supabase
      .from('refunds')
      .insert({
        workspace_id: workspaceId,
        invoice_id: invoiceId,
        gateway,
        record_only: recordOnly,
        gateway_refund_id: gatewayRefundId,
        amount: refundAmount,
        reason,
        triggered_by: userId,
        source: 'admin_action',
      })
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    logger.info({ invoiceId, gateway, recordOnly, refundRowId: refundRow.id }, 'refunds.invoice.completed');
    return { refundId: refundRow.id, recordOnly, gateway, amount: refundAmount };
  } catch (err) {
    return rethrowSafe(err, 'refunds.invoice.failed', { invoiceId });
  }
}

/**
 * Refunds a paid course enrollment. Flipping enrollments.payment_status away from 'paid' is
 * sufficient to immediately re-lock paid lesson content — verifyLessonAccess() already gates
 * on that field, no separate revocation step is needed.
 */
export async function refundEnrollment(enrollmentId: string, reason: string, amount?: number): Promise<RefundResult> {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(ALLOWED_REFUND_ROLES);
    const supabase = createAdminClient();

    const { data: enrollment, error: fetchErr } = await supabase
      .from('enrollments')
      .select('id, payment_status, stripe_payment_intent_id, course:courses!inner(id, workspace_id, price)')
      .eq('id', enrollmentId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    // Verified in JS rather than as a query filter on the embedded resource (matches the
    // established pattern elsewhere in this codebase, e.g. lms.ts's module/course ownership
    // checks) — never trusts a client-supplied workspaceId, always the caller's own session
    // workspace resolved by requireWorkspaceRole().
    if (!enrollment || (enrollment.course as any)?.workspace_id !== workspaceId) {
      throw new NotFoundError('Enrollment');
    }
    if (enrollment.payment_status !== 'paid') {
      throw new ValidationError(`Cannot refund an enrollment with payment status "${enrollment.payment_status}" — only paid enrollments can be refunded.`);
    }

    const refundAmount = amount ?? (enrollment.course as any)?.price ?? 0;
    if (!refundAmount || refundAmount <= 0) {
      throw new ValidationError('Refund amount must be greater than zero.');
    }

    let gateway: 'stripe' | 'payfast' = 'payfast';
    let recordOnly = true;
    let gatewayRefundId: string | null = null;

    if (enrollment.stripe_payment_intent_id) {
      gateway = 'stripe';
      try {
        const refund = await stripe.refunds.create({
          payment_intent: enrollment.stripe_payment_intent_id,
          amount: Math.round(refundAmount * 100),
          reason: 'requested_by_customer',
        });
        gatewayRefundId = refund.id;
        recordOnly = false;
      } catch (stripeErr) {
        rethrowSafe(stripeErr, 'refunds.enrollment.stripe_api.failed', { enrollmentId });
      }
    }

    const { error: updateErr } = await supabase
      .from('enrollments')
      .update({ payment_status: 'refunded' })
      .eq('id', enrollmentId);
    if (updateErr) throw updateErr;

    const { data: refundRow, error: insertErr } = await supabase
      .from('refunds')
      .insert({
        workspace_id: workspaceId,
        enrollment_id: enrollmentId,
        gateway,
        record_only: recordOnly,
        gateway_refund_id: gatewayRefundId,
        amount: refundAmount,
        reason,
        triggered_by: userId,
        source: 'admin_action',
      })
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    logger.info({ enrollmentId, gateway, recordOnly, refundRowId: refundRow.id }, 'refunds.enrollment.completed');
    return { refundId: refundRow.id, recordOnly, gateway, amount: refundAmount };
  } catch (err) {
    return rethrowSafe(err, 'refunds.enrollment.failed', { enrollmentId });
  }
}

/**
 * Refunds a paid booking/lease (PayFast-only payment path — no Stripe equivalent exists for
 * bookings in this codebase). Always record-only: PayFast has no public refund API for standard
 * SA merchants. Cancels the associated appointment (status change alone releases the slot —
 * scheduling.ts's availability query only counts 'scheduled' appointments) and releases the
 * lease hold, and flips the linked invoice (found via its metadata.lease_id, set at booking-
 * confirmation time) to refunded.
 */
export async function refundBookingLease(leaseId: string, reason: string): Promise<RefundResult> {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(ALLOWED_REFUND_ROLES);
    const supabase = createAdminClient();

    const { data: lease, error: fetchErr } = await supabase
      .from('booking_leases')
      .select('id, workspace_id, status')
      .eq('id', leaseId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!lease) throw new NotFoundError('Booking');
    if (lease.status !== 'confirmed') {
      throw new ValidationError(`Cannot refund a booking with status "${lease.status}" — only confirmed (paid) bookings can be refunded.`);
    }

    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .eq('metadata->>lease_id', leaseId)
      .maybeSingle();

    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, status, total_amount')
      .eq('workspace_id', workspaceId)
      .eq('metadata->>lease_id', leaseId)
      .maybeSingle();

    // Release the lease hold and cancel the appointment — this is what actually frees the slot
    // for rebooking (scheduling.ts's availability queries filter on lease status = 'confirmed'
    // / 'holding' and appointment status = 'scheduled'; neither still matches after this).
    await supabase.from('booking_leases').update({ status: 'released' }).eq('id', leaseId);
    if (appointment && appointment.status !== 'cancelled') {
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointment.id);
    }
    if (invoice && invoice.status === 'paid') {
      await supabase.from('invoices').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', invoice.id);
    }

    const refundAmount = invoice?.total_amount ?? 0;

    const { data: refundRow, error: insertErr } = await supabase
      .from('refunds')
      .insert({
        workspace_id: workspaceId,
        invoice_id: invoice?.id ?? null,
        appointment_id: appointment?.id ?? null,
        gateway: 'payfast',
        record_only: true,
        gateway_refund_id: null,
        amount: refundAmount,
        reason,
        triggered_by: userId,
        source: 'admin_action',
      })
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    logger.info({ leaseId, refundRowId: refundRow.id }, 'refunds.booking_lease.completed');
    return { refundId: refundRow.id, recordOnly: true, gateway: 'payfast', amount: refundAmount };
  } catch (err) {
    return rethrowSafe(err, 'refunds.booking_lease.failed', { leaseId });
  }
}
