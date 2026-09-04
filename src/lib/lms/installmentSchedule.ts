import type Stripe from 'stripe';

/**
 * Course Start Method 4, Part 2 — turn the live subscription a payment-plan Checkout Session
 * just created into a REAL fixed-term Stripe Subscription Schedule that stops after
 * `numberOfPayments` charges and then cancels the subscription.
 *
 * STEP 0 drift finding (verified against the real test-mode API, SDK 22.6.0 /
 * 2026-08-26.dahlia): Part 1's audit proposed a single phase with `iterations = N`. That
 * parameter is REJECTED by the current API ("Received unknown parameter: phases[iterations]")
 * on both create and update. The mechanism that actually works today: create the schedule
 * `from_subscription`, then update it to a single phase running from the subscription's
 * current period start to start + N billing periods, with `end_behavior: 'cancel'`. Stripe
 * aligns the `end_date` to a billing boundary; since `start_date` is already a period
 * boundary, start + N calendar periods lands exactly on the Nth boundary = N total charges.
 */
export async function createInstallmentSchedule(
  stripeClient: Stripe,
  params: { subscriptionId: string; numberOfPayments: number; interval: 'month' | 'year' }
): Promise<{ scheduleId: string; endDate: number }> {
  const { subscriptionId, numberOfPayments, interval } = params;

  const schedule = await stripeClient.subscriptionSchedules.create({
    from_subscription: subscriptionId,
  });

  const phase0 = schedule.phases[0];
  const start = phase0.start_date; // unix seconds, a real billing-cycle boundary
  const d = new Date(start * 1000);
  if (interval === 'year') d.setFullYear(d.getFullYear() + numberOfPayments);
  else d.setMonth(d.getMonth() + numberOfPayments);
  const endDate = Math.floor(d.getTime() / 1000);

  const updated = await stripeClient.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'cancel',
    phases: [
      {
        items: phase0.items.map((i) => ({
          price: typeof i.price === 'string' ? i.price : i.price.id,
          quantity: i.quantity || 1,
        })),
        start_date: start,
        end_date: endDate,
      },
    ],
    metadata: { leadsmind_installment_plan: 'true', installments_total: String(numberOfPayments) },
  });

  return { scheduleId: updated.id, endDate };
}

/**
 * True when a `customer.subscription.deleted` event is the natural end of a completed
 * installment plan (all N payments made) rather than a real cancellation. Kept as its own
 * function so the webhook's revoke path can never confuse the two.
 *
 * A schedule with `end_behavior: 'cancel'` cancels its subscription when it finishes, which
 * fires `customer.subscription.deleted` — with `subscription.schedule` set and that schedule
 * in status `completed`. A user/admin cancellation has no schedule, or a schedule not in
 * `completed`.
 */
export async function isCompletedInstallmentCancellation(
  stripeClient: Stripe,
  subscription: Stripe.Subscription
): Promise<boolean> {
  const scheduleRef = (subscription as any).schedule;
  if (!scheduleRef) return false;
  try {
    const scheduleId = typeof scheduleRef === 'string' ? scheduleRef : scheduleRef.id;
    const schedule = await stripeClient.subscriptionSchedules.retrieve(scheduleId);
    return schedule.status === 'completed';
  } catch {
    return false;
  }
}
