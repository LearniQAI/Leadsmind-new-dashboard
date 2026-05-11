'use server';

import { createServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';

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
  console.error('[finance] Error fetching invoices:', error);
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
  console.error('[finance] Error fetching invoice by id:', error);
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
  console.error('[finance] Error fetching invoice settings:', error);
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
  console.error('[finance] Error fetching contacts for invoicing:', error);
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
  console.error('[finance] Error fetching products:', error);
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
  console.error('[finance] Error fetching quotes:', error);
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
  return { success: false, error: error.message };
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
  return { success: false, error: error.message };
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
  return { success: false, error: error.message };
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
  return { success: false, error: error.message };
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
  return { success: false, error: fetchError?.message || 'Quote not found' };
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
  return { success: false, error: insertError.message };
 }

 // 4. Update quote status
 await supabase
  .from('quotes')
  .update({ status: 'converted' })
  .eq('id', quoteId);

 return { success: true, data: invoice };
}

export async function deleteInvoice(id: string) {
 const supabase = await createServerClient();
 const { error } = await supabase.from('invoices').delete().eq('id', id);
 if (error) return { success: false, error: error.message };
 revalidatePath('/invoices');
 return { success: true };
}

export async function updateInvoiceStatus(id: string, status: string) {
 const supabase = await createServerClient();
 const { data, error } = await supabase
  .from('invoices')
  .update({ status, updated_at: new Date().toISOString() })
  .eq('id', id)
  .select()
  .single();
 if (error) return { success: false, error: error.message };
 revalidatePath('/invoices');
 return { success: true, data };
}

export async function deleteQuote(id: string) {
 const supabase = await createServerClient();
 const { error } = await supabase.from('quotes').delete().eq('id', id);
 if (error) return { success: false, error: error.message };
 revalidatePath('/proposals');
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
 if (error) return { success: false, error: error.message };
 revalidatePath('/proposals');
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

export async function createCheckoutSession(tierId: string, interval: 'month' | 'year' = 'month') {
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

 let priceId = tierId === 'pro' ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_ENTERPRISE_PRICE_ID;

 const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  mode: 'subscription',
  line_items: [{ price: priceId!, quantity: 1 }],
  metadata: { workspaceId: membership.workspace_id, tierId },
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
  customer_email: user.email,
 });

 return { url: session.url };
}
