import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import StudioHomeClient from './StudioHomeClient';

export const dynamic = 'force-dynamic';

export default async function AIStudioPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/login');

  const supabase = await createServerClient();

  const [creditsRes, generationsRes] = await Promise.all([
    supabase
      .from('ai_usage_credits')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
    supabase
      .from('ai_generations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  const credits = creditsRes.data || {
    plan_monthly_credits: 500,
    credits_used_this_period: 0,
    credits_purchased_addon: 0,
    billing_cycle_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
  };

  const generations = generationsRes.data || [];

  return (
    <MetaData pageTitle="AI Operations Studio">
      <Wrapper>
        <StudioHomeClient 
          workspaceId={workspaceId} 
          initialCredits={credits} 
          initialGenerations={generations} 
        />
      </Wrapper>
    </MetaData>
  );
}
