'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

interface CreateFunnelOrderInput {
  funnelId: string; // trusted only as a lookup key — workspace_id is still re-derived from the matched row, never from client input
  stepPath: string; // the funnel step's path_name, e.g. '/' or '/order-form'
  productName: string;
  amount: number;
  currency: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  // Set for Upsell/Downsell "second lightweight checkout" charges — the customer
  // isn't asked to re-enter their details, so the contact (and its name/email for
  // the PayFast redirect) is pulled from the order this one follows on from,
  // instead of the firstName/lastName/email fields above.
  parentOrderId?: string;
  // Tasks 35-37: which connected gateway to route this checkout through.
  // Defaults to 'payfast' (the only gateway this flow supported before) so
  // every existing caller of createFunnelOrder keeps working unmodified.
  gateway?: 'payfast' | 'paystack' | 'flutterwave' | 'ozow';
}

// Reachable from a fully public, unauthenticated funnel page (anonymous visitors
// filling in an Order Form have no session/RLS visibility) — mirrors the security
// pattern already established by resolvePageWorkspaceId/handlePageFormSubmission
// in builder.ts: use the admin client since RLS has nothing to authenticate
// against for this caller, and never trust caller-supplied workspace_id — it's
// always re-derived here from the funnel_steps row actually matched server-side.
//
// Resolves the step by (funnelId, stepPath) rather than a page id: this widget
// renders on the public /p/[workspaceSlug]/[subdomain]/[pageSlug] route, which
// has no [pageId] route param at all (that only exists under /editor/funnel/...),
// so there is no page id available to key off client-side.
export async function createFunnelOrder(input: CreateFunnelOrderInput) {
  try {
    const { funnelId, stepPath, productName, amount, currency, parentOrderId, gateway = 'payfast' } = input;
    let { firstName, lastName, email } = input;
    if (!funnelId || !stepPath || !amount || amount <= 0) {
      return { success: false, error: 'Missing required order details' };
    }

    const supabase = createAdminClient();

    // 1. Resolve trusted context: the funnel step matching this exact funnel + path.
    const { data: funnelStep, error: stepError } = await supabase
      .from('funnel_steps')
      .select('id, funnel_id, path_name, funnel:funnels(workspace_id, subdomain, workspace:workspaces(slug))')
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

    // 2. Resolve the contact. Upsell/Downsell ("second lightweight checkout")
    // reuse the parent order's contact rather than asking the visitor to
    // re-enter their details — parentOrderId is never trusted for anything
    // beyond this lookup (workspace/contact still come from the matched row).
    let contactId: string | null = null;
    if (parentOrderId) {
      const { data: parentOrder } = await supabase
        .from('funnel_orders')
        .select('contact_id, workspace_id, contact:contacts(email, first_name, last_name)')
        .eq('id', parentOrderId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (!parentOrder?.contact_id) {
        return { success: false, error: 'Could not find the original order for this offer' };
      }
      contactId = parentOrder.contact_id;
      const parentContact = Array.isArray(parentOrder.contact) ? parentOrder.contact[0] : parentOrder.contact;
      email = parentContact?.email || email;
      firstName = parentContact?.first_name || firstName;
      lastName = parentContact?.last_name || lastName;
    } else {
      if (!email) {
        return { success: false, error: 'Missing required order details' };
      }
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
            source: 'Funnel Order Form',
          })
          .select('id')
          .single();

        if (contactError) throw contactError;
        contactId = newContact.id;
      }
    }

    // 3. Create the pending order — created before redirect (unlike the reactive
    // course-purchase precedent) so the webhook has a stable id to resolve back to,
    // and so abandoned/failed attempts are visible even if PayFast never calls back.
    const { data: order, error: orderError } = await supabase
      .from('funnel_orders')
      .insert({
        workspace_id: workspaceId,
        funnel_id: funnelId,
        funnel_step_id: funnelStepId,
        contact_id: contactId,
        parent_order_id: parentOrderId || null,
        status: 'pending',
        amount,
        currency: currency || 'ZAR',
        gateway,
      })
      .select('id')
      .single();

    if (orderError) throw orderError;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const workspaceInfo = Array.isArray(funnelInfo?.workspace) ? funnelInfo?.workspace[0] : funnelInfo?.workspace;
    const orderFormUrl = workspaceInfo?.slug && funnelInfo?.subdomain
      ? `${appUrl}/p/${workspaceInfo.slug}/${funnelInfo.subdomain}${stepPath === '/' ? '' : stepPath}`
      : appUrl;

    // For a follow-on (Upsell/Downsell) order, ?order= must keep meaning "the
    // parent order" throughout this page's lifecycle (it's how the widget knows
    // what to link a retried Accept to) — this charge's own id for return-polling
    // goes in a separate ?charge= param instead of overloading ?order=. For a
    // plain Order Form purchase (no parent), ?order= is simply this order's own id.
    const returnParams = parentOrderId
      ? `order=${parentOrderId}&charge=${order.id}`
      : `order=${order.id}`;

    let checkoutUrl: string;
    let gatewayRef: string | null = null;

    if (gateway === 'paystack') {
      const { getGatewayCredentials } = await import('@/lib/paymentGateways/credentials');
      const creds = await getGatewayCredentials(workspaceId, 'paystack');
      if (!creds) return { success: false, error: 'Paystack is not connected for this workspace' };

      const { initializeCheckout } = await import('@/lib/paymentGateways/paystackGateway');
      gatewayRef = `fo_${order.id}`;
      const result = await initializeCheckout({
        secretKey: creds.secretKey,
        email: email || 'customer@example.com',
        amount,
        currency: currency || 'ZAR',
        reference: gatewayRef,
        callback_url: `${orderFormUrl}?payment=success&${returnParams}`,
        metadata: { workspaceId, orderId: order.id, type: 'funnel_order' },
      });
      checkoutUrl = result.authorization_url;
    } else if (gateway === 'flutterwave') {
      const { getGatewayCredentials } = await import('@/lib/paymentGateways/credentials');
      const creds = await getGatewayCredentials(workspaceId, 'flutterwave');
      if (!creds) return { success: false, error: 'Flutterwave is not connected for this workspace' };

      const { initializeCheckout } = await import('@/lib/paymentGateways/flutterwaveGateway');
      gatewayRef = `fo_${order.id}`;
      const result = await initializeCheckout({
        secretKey: creds.secretKey,
        email: email || 'customer@example.com',
        name: `${firstName || ''} ${lastName || ''}`.trim() || undefined,
        amount,
        currency: currency || 'ZAR',
        tx_ref: gatewayRef,
        redirect_url: `${orderFormUrl}?${returnParams}`,
        meta: { workspaceId, orderId: order.id, type: 'funnel_order' },
      });
      checkoutUrl = result.link;
    } else if (gateway === 'ozow') {
      const { getGatewayCredentials } = await import('@/lib/paymentGateways/credentials');
      const creds = await getGatewayCredentials(workspaceId, 'ozow');
      if (!creds) return { success: false, error: 'Ozow is not connected for this workspace' };

      const { initializeCheckout } = await import('@/lib/paymentGateways/ozowGateway');
      gatewayRef = order.id;
      // BankReference shows on the customer's own bank statement — Ozow caps
      // this at 20 characters, so a truncated order id is used rather than a
      // full UUID.
      const result = await initializeCheckout({
        siteCode: creds.siteCode,
        apiKey: creds.apiKey,
        privateKey: creds.privateKey,
        amount,
        transactionReference: order.id,
        bankReference: `Order-${order.id.slice(0, 12)}`,
        cancelUrl: `${orderFormUrl}?payment=cancelled&${returnParams}`,
        errorUrl: `${orderFormUrl}?payment=error&${returnParams}`,
        successUrl: `${orderFormUrl}?payment=success&${returnParams}`,
        notifyUrl: `${appUrl}/api/webhooks/ozow`,
        isTest: process.env.NODE_ENV !== 'production',
      });
      checkoutUrl = result.url;
    } else {
      // PayFast — unchanged from before this task, same signed redirect,
      // same platform-wide env-var credentials (see Task 32's finding: this
      // page's "Connect" toggle is cosmetic for PayFast, real checkout is
      // env-var-only).
      const { generatePayFastCheckoutUrl } = await import('@/lib/calendar/payfast');
      checkoutUrl = generatePayFastCheckoutUrl({
        merchantId: process.env.PAYFAST_MERCHANT_ID || '10000100',
        merchantKey: process.env.PAYFAST_MERCHANT_KEY || '46f0z550522ac',
        returnUrl: `${orderFormUrl}?payment=success&${returnParams}`,
        cancelUrl: `${orderFormUrl}?payment=cancelled&${returnParams}`,
        notifyUrl: `${appUrl}/api/webhooks/payfast`,
        amount,
        itemName: productName || 'Order',
        paymentId: order.id,
        firstName: firstName || 'Customer',
        lastName: lastName || '',
        email: email || '',
        custom_str1: workspaceId,
        custom_str2: contactId || '',
        custom_str3: order.id,
        custom_str4: 'funnel_order',
      });
    }

    if (gatewayRef) {
      await supabase.from('funnel_orders').update({ gateway_ref: gatewayRef }).eq('id', order.id);
    }

    return { success: true, checkoutUrl, orderId: order.id };
  } catch (err: any) {
    logger.error({ err }, 'funnel_orders.create.failed');
    return { success: false, error: 'Failed to start checkout' };
  }
}

// Public, unauthenticated read — lets the Order Form widget know which
// gateways it can actually offer a visitor, WITHOUT exposing
// useWorkspaceIntegrations (that hook's route requires an authenticated
// admin/owner session, unusable on this public checkout page). Only ever
// returns provider names + a boolean, never touches `credentials`.
// PayFast is always included: unlike the 3 bring-your-own-key gateways, its
// real checkout path is platform-wide env vars, not a per-workspace
// `workspace_integrations` row (confirmed in Task 32 — that row is cosmetic
// for PayFast), so its availability isn't gated by a "connected" flag here.
export async function getAvailablePaymentGateways(funnelId: string): Promise<{ gateway: string; label: string }[]> {
  const available: { gateway: string; label: string }[] = [{ gateway: 'payfast', label: 'PayFast' }];
  try {
    if (!funnelId) return available;
    const supabase = createAdminClient();

    const { data: funnel } = await supabase
      .from('funnels')
      .select('workspace_id')
      .eq('id', funnelId)
      .maybeSingle();

    if (!funnel?.workspace_id) return available;

    const { data: integrations } = await supabase
      .from('workspace_integrations')
      .select('provider, connected')
      .eq('workspace_id', funnel.workspace_id)
      .eq('category', 'payment_gateway')
      .eq('connected', true)
      .in('provider', ['paystack', 'flutterwave', 'ozow']);

    const labels: Record<string, string> = { paystack: 'Paystack', flutterwave: 'Flutterwave', ozow: 'Ozow' };
    for (const row of integrations || []) {
      available.push({ gateway: row.provider, label: labels[row.provider] || row.provider });
    }
    return available;
  } catch (err: any) {
    logger.error({ err, funnelId }, 'funnel_orders.get_available_gateways.failed');
    return available;
  }
}

// Public, unauthenticated read — used by the return page to check whether the
// order has been marked paid yet (PayFast's server-to-server ITN callback can
// lag slightly behind the browser's return_url redirect). Also resolves the
// live URL for the next step once the webhook has recorded one, so the client
// doesn't need to separately re-derive workspace/subdomain/path itself.
export async function getFunnelOrderStatus(orderId: string) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('funnel_orders')
      .select('id, status, next_step_id')
      .eq('id', orderId)
      .single();

    if (error || !data) return { success: false, error: 'Order not found' };

    let nextStepUrl: string | null = null;
    if (data.next_step_id) {
      const { data: nextStep } = await supabase
        .from('funnel_steps')
        .select('path_name, funnel:funnels(subdomain, workspace:workspaces(slug))')
        .eq('id', data.next_step_id)
        .single();

      const funnelInfo = Array.isArray(nextStep?.funnel) ? nextStep?.funnel[0] : nextStep?.funnel;
      const workspaceInfo = Array.isArray(funnelInfo?.workspace) ? funnelInfo?.workspace[0] : funnelInfo?.workspace;
      if (workspaceInfo?.slug && funnelInfo?.subdomain) {
        const path = nextStep?.path_name === '/' ? '' : nextStep?.path_name || '';
        // Carries this order's id forward as ?order= — an Upsell/Downsell landed
        // on next needs it to know which order it's following on from (there's no
        // other way for that page to learn its "parent" order, since it doesn't
        // collect the visitor's details again).
        nextStepUrl = `/p/${workspaceInfo.slug}/${funnelInfo.subdomain}${path}?order=${orderId}`;
      }
    }

    return { success: true, order: data, nextStepUrl };
  } catch (err: any) {
    logger.error({ err }, 'funnel_orders.get_status.failed');
    return { success: false, error: 'Failed to fetch order status' };
  }
}

// Resolves an Upsell/Downsell step's Decline target (config.on_decline_step_id)
// to a real live URL, so the widget's Decline button can navigate there
// client-side with no payment involved. Same (funnelId, stepPath) resolution
// pattern as createFunnelOrder, for the same reason: no page id exists on the
// public route this renders on.
export async function getStepDeclineUrl(funnelId: string, stepPath: string) {
  try {
    if (!funnelId || !stepPath) return { success: false, error: 'Missing step context' };
    const supabase = createAdminClient();

    const { data: step, error: stepError } = await supabase
      .from('funnel_steps')
      .select('config')
      .eq('funnel_id', funnelId)
      .eq('path_name', stepPath)
      .single();

    if (stepError || !step) return { success: false, error: 'Invalid funnel step' };

    const declineStepId = (step.config as any)?.on_decline_step_id;
    if (!declineStepId) return { success: true, declineUrl: null };

    const { data: declineStep } = await supabase
      .from('funnel_steps')
      .select('path_name, funnel:funnels(subdomain, workspace:workspaces(slug))')
      .eq('id', declineStepId)
      .single();

    const funnelInfo = Array.isArray(declineStep?.funnel) ? declineStep?.funnel[0] : declineStep?.funnel;
    const workspaceInfo = Array.isArray(funnelInfo?.workspace) ? funnelInfo?.workspace[0] : funnelInfo?.workspace;
    if (!workspaceInfo?.slug || !funnelInfo?.subdomain) return { success: true, declineUrl: null };

    const path = declineStep?.path_name === '/' ? '' : declineStep?.path_name || '';
    return { success: true, declineUrl: `/p/${workspaceInfo.slug}/${funnelInfo.subdomain}${path}` };
  } catch (err: any) {
    logger.error({ err }, 'funnel_orders.get_step_decline_url.failed');
    return { success: false, error: 'Failed to resolve decline destination' };
  }
}

// Resolves the full purchase chain for a Thank-you page: the order that led
// here (via ?order=) plus any accepted upsell/downsell orders chained off it
// (parent_order_id), for an order summary. Public/unauthenticated — same
// reasoning as the rest of this file.
export async function getFunnelOrderChain(orderId: string) {
  try {
    if (!orderId) return { success: false, error: 'Missing order id' };
    const supabase = createAdminClient();

    const { data: root, error } = await supabase
      .from('funnel_orders')
      .select('id, amount, currency, status, parent_order_id, created_at')
      .eq('id', orderId)
      .single();

    if (error || !root) return { success: false, error: 'Order not found' };

    // Walk up to the true root (a Downsell's parent is the Upsell it followed,
    // whose parent is the original Order Form purchase) so the chain always
    // starts from the beginning regardless of which order id landed here.
    let rootOrder = root;
    while (rootOrder.parent_order_id) {
      const { data: parent } = await supabase
        .from('funnel_orders')
        .select('id, amount, currency, status, parent_order_id, created_at')
        .eq('id', rootOrder.parent_order_id)
        .single();
      if (!parent) break;
      rootOrder = parent;
    }

    const { data: chain } = await supabase
      .from('funnel_orders')
      .select('id, amount, currency, status, parent_order_id, created_at')
      .or(`id.eq.${rootOrder.id},parent_order_id.eq.${rootOrder.id}`)
      .order('created_at', { ascending: true });

    const paidOrders = (chain || []).filter((o) => o.status === 'paid');
    const total = paidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

    return { success: true, orders: chain || [], total, currency: rootOrder.currency };
  } catch (err: any) {
    logger.error({ err }, 'funnel_orders.get_chain.failed');
    return { success: false, error: 'Failed to load order summary' };
  }
}

// Called from the order-form page when PayFast's cancel_url redirect fires
// (PayFast does not reliably send a server-to-server ITN for cancellations —
// the browser-side redirect is the only signal in most flows). Idempotent:
// only moves a still-'pending' order to 'abandoned', never overwrites 'paid'.
export async function markFunnelOrderAbandoned(orderId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('funnel_orders')
      .update({ status: 'abandoned' })
      .eq('id', orderId)
      .eq('status', 'pending');

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    logger.error({ err, orderId }, 'funnel_orders.mark_abandoned.failed');
    return { success: false, error: 'Failed to update order' };
  }
}
