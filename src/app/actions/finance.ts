'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (e) {
    // Gracefully handle next/cache bailout when run outside server context
  }
}

// --- Invoice & Quote Actions (Restored) ---

export async function getInvoices(workspaceId: string, contactId?: string) {
 const supabase = await createServerClient();
 let query = supabase
  .from('invoices')
  .select('*, contact:contacts(*)')
  .eq('workspace_id', workspaceId);

 if (contactId) {
  query = query.eq('contact_id', contactId);
 }

 const { data, error } = await query.order('created_at', { ascending: false });

 if (error) {
  logger.error({ err: error, workspaceId }, 'finance.invoices.fetch.failed');
  return [];
 }
 return data || [];
}

export async function getInvoiceById(id: string) {
 const supabase = await createServerClient();
 const { data, error } = await supabase
  .from('invoices')
  .select('*, contact:contacts(*)')
  .eq('id', id)
  .single();

 if (error) {
  logger.error({ err: error, invoiceId: id }, 'finance.invoice.fetch.failed');
  return null;
 }
 return data;
}

export async function getInvoiceSettings(workspaceId: string) {
 const supabase = await createServerClient();
 const { data, error } = await supabase
  .from('workspaces')
  .select('invoice_settings')
  .eq('id', workspaceId)
  .single();

 if (error) {
  logger.error({ err: error, workspaceId }, 'finance.invoice_settings.fetch.failed');
  return null;
 }
 return data.invoice_settings;
}

export async function getContactsForInvoicing(workspaceId: string) {
 const supabase = await createServerClient();
 const { data, error } = await supabase
  .from('contacts')
  .select('*')
  .eq('workspace_id', workspaceId)
  .order('first_name', { ascending: true });

 if (error) {
  logger.error({ err: error, workspaceId }, 'finance.contacts_for_invoicing.fetch.failed');
  return [];
 }
 return data || [];
}

export async function getProducts(workspaceId: string) {
 const supabase = await createServerClient();
 const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('workspace_id', workspaceId)
  .order('name', { ascending: true });

 if (error) {
  logger.error({ err: error, workspaceId }, 'finance.products.fetch.failed');
  return [];
 }
 return data || [];
}

export async function getQuotes(workspaceId: string, contactId?: string) {
 const supabase = await createServerClient();
 let query = supabase
  .from('quotes')
  .select('*, contact:contacts(*)')
  .eq('workspace_id', workspaceId);

 if (contactId) {
  query = query.eq('contact_id', contactId);
 }

 const { data, error } = await query.order('created_at', { ascending: false });

 if (error) {
  logger.error({ err: error, workspaceId }, 'finance.quotes.fetch.failed');
  return [];
 }
 return data || [];
}

export async function saveInvoice(data: any) {
 const supabase = await createServerClient();
 const { data: invoice, error } = await supabase
  .from('invoices')
  .insert(data)
  .select()
  .single();

 if (error) {
  logger.error({ err: error }, 'finance.invoice.save.failed');
  const clientError = toClientError(error);
  return { success: false, error: clientError.error };
 }

  if (invoice) {
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
      dispatchWebhook(invoice.workspace_id, 'invoice.created', {
        invoice: { id: invoice.id, number: invoice.invoice_number, amount: invoice.total_amount ?? invoice.amount, currency: invoice.currency || 'ZAR', status: invoice.status, contact_id: invoice.contact_id },
      }).catch(() => {});
    } catch (e) {
      logger.error({ err: e, invoiceId: invoice.id }, 'finance.invoice.create_webhook_dispatch.failed');
    }
  }

 return { success: true, data: invoice };
}

export async function updateInvoice(id: string, data: any) {
 const supabase = await createServerClient();
 const { data: invoice, error } = await supabase
  .from('invoices')
  .update(data)
  .eq('id', id)
  .select()
  .single();

 if (error) {
  logger.error({ err: error, invoiceId: id }, 'finance.invoice.update.failed');
  const clientError = toClientError(error);
  return { success: false, error: clientError.error };
 }
 return { success: true, data: invoice };
}

export async function saveQuote(data: any) {
 const supabase = await createServerClient();
 const { data: quote, error } = await supabase
  .from('quotes')
  .insert(data)
  .select()
  .single();

 if (error) {
  logger.error({ err: error }, 'finance.quote.save.failed');
  const clientError = toClientError(error);
  return { success: false, error: clientError.error };
 }
 return { success: true, data: quote };
}

export async function updateQuote(id: string, data: any) {
 const supabase = await createServerClient();
 const { data: quote, error } = await supabase
  .from('quotes')
  .update(data)
  .eq('id', id)
  .select()
  .single();

 if (error) {
  logger.error({ err: error, quoteId: id }, 'finance.quote.update.failed');
  const clientError = toClientError(error);
  return { success: false, error: clientError.error };
 }
 return { success: true, data: quote };
}

export async function convertToInvoice(quoteId: string) {
 const supabase = await createServerClient();

 // 1. Fetch the quote
 const { data: quote, error: fetchError } = await supabase
  .from('quotes')
  .select('*')
  .eq('id', quoteId)
  .single();

 if (fetchError || !quote) {
  if (fetchError) logger.error({ err: fetchError, quoteId }, 'finance.quote_to_invoice.fetch.failed');
  return { success: false, error: 'Quote not found' };
 }

 // 2. Check if already converted
 if (quote.status === 'converted') {
  return { success: false, error: 'Quote already converted to invoice' };
 }

 // 3. Create the invoice
 const { data: invoice, error: insertError } = await supabase
  .from('invoices')
  .insert({
   workspace_id: quote.workspace_id,
   contact_id: quote.contact_id,
   invoice_number: quote.quote_number.replace('Q-', 'INV-'), // Simple replacement
   items: quote.items,
   subtotal: quote.subtotal,
   tax_total: quote.tax_total,
   total_amount: quote.total_amount,
   currency: quote.currency,
   notes: quote.notes,
   terms: quote.terms,
   status: 'draft',
   amount_due: quote.total_amount,
   amount_paid: 0
  })
  .select()
  .single();

 if (insertError) {
  logger.error({ err: insertError, quoteId }, 'finance.quote_to_invoice.insert.failed');
  return { success: false, error: 'Failed to convert quote to invoice.' };
 }

 // 4. Update quote status
 await supabase
  .from('quotes')
  .update({ status: 'converted' })
  .eq('id', quoteId);

  if (invoice) {
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
      dispatchWebhook(invoice.workspace_id, 'invoice.created', {
        invoice: { id: invoice.id, number: invoice.invoice_number, amount: invoice.total_amount ?? invoice.amount, currency: invoice.currency || 'ZAR', status: invoice.status, contact_id: invoice.contact_id },
      }).catch(() => {});
    } catch (e) {
      logger.error({ err: e, invoiceId: invoice.id }, 'finance.quote_to_invoice.webhook_dispatch.failed');
    }
  }

 return { success: true, data: invoice };
}

export async function deleteInvoice(id: string) {
 const supabase = await createServerClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) throw new UnauthorizedError();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) throw new ForbiddenError('No active workspace');
 const { error } = await supabase.from('invoices').delete().eq('id', id).eq('workspace_id', workspaceId);
 if (error) {
  logger.error({ err: error, workspaceId, invoiceId: id }, 'finance.invoice.delete.failed');
  return { success: false, error: 'Failed to delete invoice.' };
 }
  safeRevalidatePath('/invoices');
  return { success: true };
}

export async function updateInvoiceStatus(id: string, status: string) {
  let data: any = null;

  if (status === 'paid') {
    try {
      const { AttributionEngine } = await import('@/lib/analytics/AttributionEngine');
      const res = await AttributionEngine.trackInvoicePayment(id);
      if (res.success && res.data) {
        data = res.data;
      } else {
        logger.error({ err: res.error, invoiceId: id }, 'finance.invoice_status.attribution_engine.failed');
      }
    } catch (err) {
      logger.error({ err, invoiceId: id }, 'finance.invoice_status.attribution_engine.load_failed');
    }
  }

  if (!data) {
    const supabase = await createServerClient();
    const { data: updatedData, error } = await supabase
     .from('invoices')
     .update({ status, updated_at: new Date().toISOString() })
     .eq('id', id)
     .select('*, contact:contacts(*)')
     .single();
    if (error) {
      logger.error({ err: error, invoiceId: id }, 'finance.invoice_status.update.failed');
      return { success: false, error: 'Failed to update invoice status.' };
    }
    data = updatedData;
  }

  if (status === 'paid' && data) {
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
      const contactName = (data as any).contact
        ? `${(data as any).contact.first_name || ''} ${(data as any).contact.last_name || ''}`.trim()
        : null;
      dispatchWebhook(data.workspace_id, 'invoice.paid', {
        invoice: {
          id: data.id,
          number: data.invoice_number,
          amount: data.total_amount,
          currency: data.currency || 'ZAR',
          paid_at: new Date().toISOString(),
          contact: {
            id: data.contact_id,
            name: contactName || null,
          }
        }
      }).catch(() => {});
    } catch (e) {
      logger.error({ err: e, invoiceId: id }, 'finance.invoice_paid.webhook_dispatch.failed');
    }

    // Auto-create courier shipment if shipping address is present
    try {
      const metadata = (data.metadata || {}) as any
      const customFields = (data.custom_field_values || {}) as any
      const contactMetadata = (data.contact?.metadata || {}) as any
      
      const shippingAddress = 
        metadata.shipping_address || 
        metadata.shippingAddress || 
        customFields.shipping_address || 
        customFields.shippingAddress || 
        contactMetadata.shipping_address || 
        contactMetadata.shippingAddress
      
      if (shippingAddress) {
        const { createAdminClient } = await import('@/lib/supabase/server')
        const adminSupabase = createAdminClient()
        
        const trackingNum = `LM-INV-${data.invoice_number || data.id.substring(0, 8)}`
        const recipientName = data.contact 
          ? `${data.contact.first_name || ''} ${data.contact.last_name || ''}`.trim()
          : null
        const recipientEmail = data.contact?.email || null

        const { data: existingShipment } = await adminSupabase
          .from('courier_shipments')
          .select('id')
          .eq('workspace_id', data.workspace_id)
          .eq('tracking_number', trackingNum)
          .maybeSingle()

        if (!existingShipment) {
          const { createShipment } = await import('@/app/actions/shipments')
          await createShipment(data.workspace_id, {
            tracking_number: trackingNum,
            recipient_name: recipientName || undefined,
            recipient_email: recipientEmail || undefined
          })

          // Update source and source_id details
          await adminSupabase
            .from('courier_shipments')
            .update({
              source: 'invoice',
              source_id: data.id
            })
            .eq('workspace_id', data.workspace_id)
            .eq('tracking_number', trackingNum)
        }
      }
    } catch (err) {
      logger.error({ err, invoiceId: id }, 'finance.invoice_paid.auto_shipment.failed');
    }

    // Affiliate Commission Conversion
    try {
      const contact = (data as any).contact;
      if (contact?.referred_by_affiliate_id && contact?.referred_programme_id) {
        const { createAdminClient } = await import('@/lib/supabase/server');
        const adminSupabase = createAdminClient();
        const { data: existingComm } = await adminSupabase
          .from('affiliate_commissions')
          .select('id')
          .eq('source_type', 'invoice')
          .eq('source_id', data.id)
          .maybeSingle();

        if (!existingComm) {
          const { recordConversion } = await import('@/lib/affiliate/commission');
          await recordConversion({
            workspaceId: data.workspace_id,
            affiliateId: contact.referred_by_affiliate_id,
            programmeId: contact.referred_programme_id,
            sourceType: 'invoice',
            sourceId: data.id,
            contactId: data.contact_id,
            amount: Number(data.total_amount || 0)
          });
        }
      }
    } catch (affError) {
      logger.error({ err: affError, invoiceId: id }, 'finance.invoice_paid.affiliate_conversion.failed');
    }
  }

  safeRevalidatePath('/invoices');
  return { success: true, data };
}

export async function deleteQuote(id: string) {
 const supabase = await createServerClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) throw new UnauthorizedError();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) throw new ForbiddenError('No active workspace');
 const { error } = await supabase.from('quotes').delete().eq('id', id).eq('workspace_id', workspaceId);
 if (error) {
  logger.error({ err: error, workspaceId, quoteId: id }, 'finance.quote.delete.failed');
  return { success: false, error: 'Failed to delete quote.' };
 }
  safeRevalidatePath('/quotes');
  return { success: true };
}

export async function updateQuoteStatus(id: string, status: string) {
 const supabase = await createServerClient();
 const { data, error } = await supabase
  .from('quotes')
  .update({ status, updated_at: new Date().toISOString() })
  .eq('id', id)
  .select()
  .single();
 if (error) {
  logger.error({ err: error, quoteId: id }, 'finance.quote_status.update.failed');
  return { success: false, error: 'Failed to update quote status.' };
 }
  safeRevalidatePath('/quotes');
  return { success: true, data };
}

// --- Stripe & SaaS Subscription Actions ---


export async function getSaaSTiers() {
 return [
  {
   id: 'starter',
   name: 'Starter',
   monthlyPrice: 0,
   features: ['Up to 500 contacts', '1 Pipeline', 'Basic support'],
  },
  {
   id: 'pro',
   name: 'Pro',
   monthlyPrice: 77,
   features: ['Unlimited contacts', 'Social Inbox', 'Priority support'],
  },
  {
   id: 'enterprise',
   name: 'Enterprise',
   monthlyPrice: 237,
   features: ['Everything in Pro', 'White-label', 'SLA guarantee'],
  },
 ];
}

// Spark is the free tier and never reaches checkout — it routes straight to signup.
const PAID_TIER_PRICE_ENV: Record<string, { month: string; year: string }> = {
 rise: { month: 'STRIPE_RISE_MONTHLY_PRICE_ID', year: 'STRIPE_RISE_ANNUAL_PRICE_ID' },
 surge: { month: 'STRIPE_SURGE_MONTHLY_PRICE_ID', year: 'STRIPE_SURGE_ANNUAL_PRICE_ID' },
 infinity: { month: 'STRIPE_INFINITY_MONTHLY_PRICE_ID', year: 'STRIPE_INFINITY_ANNUAL_PRICE_ID' },
 dynasty: { month: 'STRIPE_DYNASTY_MONTHLY_PRICE_ID', year: 'STRIPE_DYNASTY_ANNUAL_PRICE_ID' },
};

export async function createCheckoutSession(tierId: string, interval: 'month' | 'year' = 'month') {
 const tierEnv = PAID_TIER_PRICE_ENV[tierId];
 if (!tierEnv) {
  logger.error({ tierId }, 'finance.checkout.unrecognized_tier');
  return { error: 'Unrecognized pricing tier' };
 }

 const priceId = process.env[tierEnv[interval]];
 if (!priceId) {
  logger.error({ tierId, interval, envVar: tierEnv[interval] }, 'finance.checkout.missing_price_id');
  return { error: 'This plan is not yet available for checkout' };
 }

 const supabase = await createServerClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) return { error: 'Not authenticated' };

 // Logic to find user's workspace
 const { data: membership } = await supabase
  .from('workspace_members')
  .select('workspace_id')
  .eq('user_id', user.id)
  .single();

 if (!membership) return { error: 'No workspace found' };

 const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  metadata: { workspaceId: membership.workspace_id, tierId },
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
  customer_email: user.email,
 });

 return { url: session.url };
}
export async function writeOffInvoice(invoiceId: string, workspaceId: string, amount: number, reason: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Create write-off record
  const { error: writeOffError } = await supabase
    .from('invoice_write_offs')
    .insert({
      invoice_id: invoiceId,
      workspace_id: workspaceId,
      amount_written_off: amount,
      reason: reason,
      logged_by: user?.id
    });

  if (writeOffError) {
    logger.error({ err: writeOffError, invoiceId, workspaceId }, 'finance.invoice.write_off.record_failed');
    return { success: false, error: 'Failed to record write-off.' };
  }

  // 2. Update invoice status
  const { error: updateError } = await supabase
    .from('invoices')
    .update({ status: 'written_off' })
    .eq('id', invoiceId);

  if (updateError) {
    logger.error({ err: updateError, invoiceId, workspaceId }, 'finance.invoice.write_off.status_update_failed');
    return { success: false, error: 'Failed to update invoice status.' };
  }

  safeRevalidatePath('/invoices');
  return { success: true };
}

export async function createInvoiceCheckoutSession(invoiceId: string) {
  try {
    const supabase = createAdminClient(); // Bypasses auth so public guest portal visitors can execute checkout
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, contact:contacts(*)')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return { error: 'Invoice not found or could not be loaded' };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: (invoice.items || []).map((item: any) => {
        const rate = Number(item.unit_amount ?? item.rate ?? 0);
        const quantity = Number(item.quantity ?? 1);
        return {
          price_data: {
            currency: invoice.currency?.toLowerCase() || 'usd',
            product_data: {
              name: item.description || 'Service/Product Item',
            },
            unit_amount: Math.round(rate * 100),
          },
          quantity,
        };
      }),
      metadata: {
        invoiceId: invoice.id,
        workspaceId: invoice.workspace_id,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/invoices/${invoice.id}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/invoices/${invoice.id}?payment=canceled`,
      customer_email: invoice.contact?.email || undefined,
    });

    return { url: session.url };
  } catch (err: any) {
    logger.error({ err, invoiceId }, 'finance.invoice_checkout.stripe.failed');
    return { error: 'Failed to create checkout session' };
  }
}

export async function generateInvoicePayFastUrl(
  invoiceId: string,
  amount: number,
  returnUrl: string,
  cancelUrl: string
) {
  try {
    const supabase = createAdminClient();
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, contact:contacts(*), workspace:workspaces(*)')
      .eq('id', invoiceId)
      .single() as any;

    if (error || !invoice) {
      return { error: 'Invoice not found or could not be loaded' };
    }

    const outstanding = Number(invoice.amount_due || invoice.total_amount || 0) - Number(invoice.amount_paid || 0);
    const settings = invoice.workspace?.invoice_settings || {};
    const allowPartial = settings.allow_partial_payments ?? false;

    let payAmount = amount;
    if (!allowPartial || !payAmount) {
      payAmount = outstanding;
    } else {
      if (payAmount > outstanding) {
        payAmount = outstanding;
      }
    }

    if (payAmount <= 0) {
      return { error: 'This invoice has already been fully paid.' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const notifyUrl = `${appUrl}/api/webhooks/payfast`;

    const { generatePayFastCheckoutUrl } = await import('@/lib/calendar/payfast');

    const redirectUrl = generatePayFastCheckoutUrl({
      merchantId: process.env.PAYFAST_MERCHANT_ID || '10000100',
      merchantKey: process.env.PAYFAST_MERCHANT_KEY || '46f0z550522ac',
      returnUrl,
      cancelUrl,
      notifyUrl,
      amount: payAmount,
      itemName: `Invoice ${invoice.invoice_number || invoice.id.substring(0, 8)} Payment`,
      paymentId: invoice.id,
      firstName: invoice.contact?.first_name || 'Customer',
      lastName: invoice.contact?.last_name || '',
      email: invoice.contact?.email || '',
      custom_str1: invoice.workspace_id,
      custom_str2: invoice.contact_id,
      custom_str4: 'invoice',
    });

    return { url: redirectUrl };
  } catch (err: any) {
    logger.error({ err, invoiceId }, 'finance.invoice_checkout.payfast.failed');
    return { error: 'Failed to create PayFast checkout URL' };
  }
}

export async function saveInvoiceSettings(workspaceId: string, settings: any) {
  try {
    const supabase = await createServerClient();
    
    // Fetch current invoice settings
    const { data: workspace, error: fetchError } = await supabase
      .from('workspaces')
      .select('invoice_settings')
      .eq('id', workspaceId)
      .single();

    if (fetchError || !workspace) {
      if (fetchError) logger.error({ err: fetchError, workspaceId }, 'finance.invoice_settings.workspace_fetch.failed');
      return { error: 'Workspace not found' };
    }

    const currentSettings = workspace.invoice_settings || {};
    const updatedSettings = {
      ...currentSettings,
      ...settings,
    };

    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ invoice_settings: updatedSettings })
      .eq('id', workspaceId);

    if (updateError) {
      logger.error({ err: updateError, workspaceId }, 'finance.invoice_settings.update.failed');
      return { error: 'Failed to save settings' };
    }

    safeRevalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, workspaceId }, 'finance.invoice_settings.save.failed');
    return { error: 'Failed to save settings' };
  }
}


