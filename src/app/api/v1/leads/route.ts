import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

  // 3. Trigger Webhooks if any (Optional enhancement)
  // We can add logic here to trigger webhooks defined in webhook_endpoints

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
