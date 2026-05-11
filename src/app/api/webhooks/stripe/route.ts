import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
 const payload = await req.text();
 const signature = req.headers.get('stripe-signature')!;
 let event;

 try {
  event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
 } catch (err: any) {
  console.error(`[Stripe Webhook] Error: ${err.message}`);
  return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
 }

 if (event.type === 'checkout.session.completed') {
  const session = event.data.object as any;
  const { workspaceId, tierId } = session.metadata;

  if (workspaceId && tierId) {
   const { error } = await supabaseAdmin
    .from('workspaces')
    .update({ 
      plan_tier: tierId,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription
    })
    .eq('id', workspaceId);
    
   if (error) {
    console.error(`[Stripe Webhook] Database update error: ${error.message}`);
   } else {
    console.log(`[Stripe Webhook] Updated workspace ${workspaceId} to tier ${tierId}`);
   }
  }
 }

 return NextResponse.json({ received: true });
}
