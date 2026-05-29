import React from 'react';
import { createClient } from '@supabase/supabase-js';
import SupportWidgetIframeClient from './SupportWidgetIframeClient';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function SupportWidgetIframePage({
  searchParams
}: {
  searchParams: { key?: string; inline?: string }
}) {
  const key = searchParams.key;
  if (!key) {
    return (
      <div className="min-h-screen bg-[#04091a] text-red-500 font-bold flex items-center justify-center p-6 text-center text-xs font-mono uppercase tracking-wider">
        ❌ Error: Widget Token Key is Missing
      </div>
    );
  }

  // Fetch settings using supabaseAdmin to bypass RLS policies for public client views
  const { data: settings } = await supabaseAdmin
    .from('support_widget_settings')
    .select('*')
    .eq('widget_key', key)
    .single();

  if (!settings) {
    return (
      <div className="min-h-screen bg-[#04091a] text-red-500 font-bold flex items-center justify-center p-6 text-center text-xs font-mono uppercase tracking-wider">
        ❌ Error: Invalid Support Widget Token
      </div>
    );
  }

  return (
    <SupportWidgetIframeClient
      settings={settings}
      isInline={searchParams.inline === 'true'}
    />
  );
}
