'use server';

import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
  const supabase = await createClient();
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
