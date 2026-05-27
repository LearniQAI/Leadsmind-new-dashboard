import React from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EmailBuilderClient } from './EmailBuilderClient';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EmailBuilderPage({ params }: PageProps) {
  const { id } = params;
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/campaigns');

  const supabase = await createServerClient();

  // Fetch campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (campaignError || !campaign) {
    redirect('/campaigns');
  }

  // Fetch workspace details
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name, logo_url, brand_color_primary, brand_color_secondary, brand_font_default')
    .eq('id', workspaceId)
    .single();

  const brandKit = {
    logoUrl: workspace?.logo_url || null,
    brandColorPrimary: workspace?.brand_color_primary || '#2563eb',
    brandColorSecondary: workspace?.brand_color_secondary || '#080f28',
    brandFontDefault: workspace?.brand_font_default || 'Inter'
  };

  return (
    <EmailBuilderClient
      campaignId={id}
      initialCampaign={campaign}
      brandKit={brandKit}
    />
  );
}
