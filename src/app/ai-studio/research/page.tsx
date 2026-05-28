import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import ResearchPortalClient from './ResearchPortalClient';

export const dynamic = 'force-dynamic';

export default async function ResearchPortalPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/login');

  const supabase = await createServerClient();

  const { data: reports } = await supabase
    .from('ai_research_reports')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  return (
    <MetaData pageTitle="AI Customer Research Agent">
      <ResearchPortalClient 
        workspaceId={workspaceId} 
        initialReports={reports || []} 
      />
    </MetaData>
  );
}
