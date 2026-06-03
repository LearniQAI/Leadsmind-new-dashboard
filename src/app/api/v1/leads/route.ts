import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

// Note: We use the service role key here because we need to bypass RLS 
// to insert leads from an external source, but we validate the workspace_id via api_key
const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
 try {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) {
   return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  // 1. Validate API Key and get workspace_id
  const { data: workspace, error: wsError } = await supabase
   .from('workspaces')
   .select('id')
   .eq('api_key', apiKey)
   .single();

  if (wsError || !workspace) {
   return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  const body = await req.json();
  const { email, first_name, last_name, phone, source, metadata } = body;

  if (!email) {
   return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // 2. Insert or Update Contact
  const { data: contact, error: contactError } = await supabase
   .from('contacts')
   .upsert({
    workspace_id: workspace.id,
    email,
    first_name: first_name || null,
    last_name: last_name || null,
    phone: phone || null,
    source: source || 'universal_api',
    metadata: metadata || {}
   }, {
    onConflict: 'workspace_id,email'
   })
   .select()
   .single();

  if (contactError) {
   console.error('Lead capture error:', contactError);
   return NextResponse.json({ error: 'Failed to capture lead' }, { status: 500 });
  }

   // 3. Send notification email to the lead
   try {
    await sendEmail({
     to: email,
     subject: `Welcome to LeadsMind - Let's get started!`,
     html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
       <h2 style="color: #6c47ff;">Thanks for stopping by!</h2>
       <p>Hello ${first_name || 'there'},</p>
       <p>We noticed you visited our platform and we've captured your interest. We're excited to help you grow your business with our automation tools.</p>
       <p>If you haven't completed your signup yet, you can do so here: <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/signup-basic" style="color: #6c47ff; font-weight: bold;">Complete Signup</a></p>
       <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
       <p style="font-size: 12px; color: #666;">This is an automated message from LeadsMind.</p>
      </div>
     `
    });
   } catch (emailErr) {
    console.error('Failed to send lead capture email:', emailErr);
   }

   // 4. Trigger Webhooks if any (Optional enhancement)
   try {
     const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
     dispatchWebhook(workspace.id, 'contact.created', {
       contact: {
         id: contact.id,
         first_name: contact.first_name,
         last_name: contact.last_name,
         email: contact.email,
         phone: contact.phone,
       }
     }).catch(() => {});
   } catch (e) {
     console.error('[webhook-dispatch-lead-api-error]', e);
   }

  return NextResponse.json({ 
   success: true, 
   message: 'Lead captured successfully',
   contact_id: contact.id 
  });

 } catch (error: any) {
  console.error('API Error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
 }
}

export async function OPTIONS() {
 return new NextResponse(null, {
  status: 200,
  headers: {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Methods': 'POST, OPTIONS',
   'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  },
 });
}
