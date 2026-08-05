import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveTierFromPlanCode, fetchSubscription, disableSubscription } from '@/lib/paystack';
import { logger } from '@/shared/logger';

export const runtime = 'nodejs';

async function deadLetter(admin: ReturnType<typeof createAdminClient>, payload: any, error: string, errorType: string, retryState: string) {
 try {
  await admin.from('webhook_dead_letters').insert({
   provider: 'paystack',
   payload,
   error,
   error_type: errorType,
   retry_state: retryState,
  });
 } catch (dbErr: any) {
  logger.error({ err: dbErr, provider: 'paystack' }, 'webhook.paystack.dead_letter_insert.failed');
 }
}

export async function POST(req: NextRequest) {
 const admin = createAdminClient();
 const rawBody = await req.text();
 let payloadObj: any = {};
 try {
  payloadObj = JSON.parse(rawBody);
 } catch {
  // signature check below will reject this anyway
 }

 const secretKey = process.env.PAYSTACK_SECRET_KEY;
 const signature = req.headers.get('x-paystack-signature');

 if (!secretKey) {
  logger.error({}, 'webhook.paystack.secret_key.missing');
  return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
 }

 const expectedSignature = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');

 const isValidSignature = !!signature
  && signature.length === expectedSignature.length
  && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

 if (!isValidSignature) {
  logger.warn({ hasSignatureHeader: !!signature }, 'webhook.paystack.signature.invalid');
  await deadLetter(admin, payloadObj, 'Invalid or missing x-paystack-signature', 'signature_invalid', 'dropped');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 }

 try {
  const event = payloadObj?.event;
  const data = payloadObj?.data || {};

  if (event === 'charge.success') {
   const workspaceId = data.metadata?.workspaceId;
   const tierId = data.metadata?.tierId;
   const customerCode = data.customer?.customer_code;

   if (workspaceId && tierId) {
    const { error } = await admin
     .from('workspaces')
     .update({
      plan_tier: tierId,
      paystack_customer_code: customerCode ?? undefined,
     })
     .eq('id', workspaceId);

    if (error) {
     logger.error({ err: error, workspaceId, tierId }, 'webhook.paystack.charge_success.update_failed');
    } else {
     logger.info({ workspaceId, tierId }, 'webhook.paystack.charge_success.applied');
    }
   } else {
    logger.warn({ reference: data.reference }, 'webhook.paystack.charge_success.missing_metadata');
   }
  } else if (event === 'subscription.create') {
   const subscriptionCode = data.subscription_code;
   const customerCode = data.customer?.customer_code;
   const tierId = data.metadata?.tierId || resolveTierFromPlanCode(data.plan?.plan_code);

   if (subscriptionCode && customerCode) {
    const updatePayload: Record<string, any> = {
     paystack_subscription_code: subscriptionCode,
     paystack_customer_code: customerCode,
    };
    if (tierId) updatePayload.plan_tier = tierId;

    // Match the workspace this subscription belongs to by customer_code —
    // charge.success (which carries workspaceId in metadata) fires first
    // and stamps paystack_customer_code, so this is reliable ordering.
    const { error, data: updatedRows } = await admin
     .from('workspaces')
     .update(updatePayload)
     .eq('paystack_customer_code', customerCode)
     .select('id');

    if (error) {
     logger.error({ err: error, subscriptionCode, customerCode }, 'webhook.paystack.subscription_create.update_failed');
    } else if (!updatedRows?.length) {
     logger.warn({ subscriptionCode, customerCode }, 'webhook.paystack.subscription_create.no_matching_workspace');
     await deadLetter(admin, payloadObj, 'No workspace matched paystack_customer_code for subscription.create', 'validation_failed', 'dropped');
    } else {
     logger.info({ subscriptionCode, customerCode, tierId }, 'webhook.paystack.subscription_create.applied');

     // Plan-switch completion: the new subscription is now confirmed active
     // on this workspace, so it's safe to disable whichever subscription it
     // replaced (stashed by createPaystackSubscription). Doing this only here
     // -- after the new one is live -- avoids a gap in access if the new
     // checkout had been abandoned instead of completed.
     const previousSubscriptionCode = data.metadata?.previousSubscriptionCode;
     if (previousSubscriptionCode && previousSubscriptionCode !== subscriptionCode) {
      try {
       const previousSub = await fetchSubscription(previousSubscriptionCode);
       await disableSubscription(previousSubscriptionCode, previousSub.email_token);
       logger.info({ previousSubscriptionCode, newSubscriptionCode: subscriptionCode }, 'webhook.paystack.subscription_create.previous_disabled');
      } catch (disableErr: any) {
       logger.error({ err: disableErr, previousSubscriptionCode, newSubscriptionCode: subscriptionCode }, 'webhook.paystack.subscription_create.previous_disable_failed');
       await deadLetter(admin, payloadObj, `Failed to disable previous subscription ${previousSubscriptionCode}: ${disableErr.message}`, 'infrastructure_failure', 'pending');
      }
     }
    }
   } else {
    logger.warn({}, 'webhook.paystack.subscription_create.missing_fields');
   }
  } else if (event === 'subscription.disable' || event === 'subscription.not_renew') {
   // The lifecycle-sync fix: downgrade back to the free tier when Paystack
   // reports the subscription has ended, instead of leaving plan_tier stuck
   // on the last paid value forever.
   const subscriptionCode = data.subscription_code;

   if (subscriptionCode) {
    const { error, data: updatedRows } = await admin
     .from('workspaces')
     .update({ plan_tier: 'spark' })
     .eq('paystack_subscription_code', subscriptionCode)
     .select('id');

    if (error) {
     logger.error({ err: error, subscriptionCode, event }, 'webhook.paystack.subscription_disable.update_failed');
    } else if (!updatedRows?.length) {
     logger.warn({ subscriptionCode, event }, 'webhook.paystack.subscription_disable.no_matching_workspace');
    } else {
     logger.info({ subscriptionCode, event }, 'webhook.paystack.subscription_disable.downgraded');
    }
   } else {
    logger.warn({ event }, 'webhook.paystack.subscription_disable.missing_subscription_code');
   }
  } else if (event === 'invoice.payment_failed') {
   // Decision: no immediate downgrade. Paystack itself retries a failed
   // charge over several days before firing subscription.disable — that
   // retry window is the grace period, rather than building a separate
   // timer here. Just log for visibility; the eventual subscription.disable
   // event (handled above) is what actually downgrades plan_tier.
   logger.warn({ subscriptionCode: data.subscription?.subscription_code, customerCode: data.customer?.customer_code }, 'webhook.paystack.invoice_payment_failed.no_action');
  } else {
   logger.info({ event }, 'webhook.paystack.event.ignored');
  }

  return NextResponse.json({ received: true });
 } catch (error: any) {
  logger.error({ err: error }, 'webhook.paystack.failed');
  await deadLetter(admin, payloadObj, error.message, 'infrastructure_failure', 'pending');
  // Transient infrastructure failure -> non-2xx so Paystack retries with backoff
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
 }
}
