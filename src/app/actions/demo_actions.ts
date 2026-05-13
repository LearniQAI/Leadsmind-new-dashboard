'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function sendDemoLead(apiKey: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        email: `demo.lead.${Math.floor(Math.random() * 10000)}@example.com`,
        first_name: 'Demo',
        last_name: 'User',
        source: 'demo_mode',
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        }
      })
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return { error: error.message };
  }
}
