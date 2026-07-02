import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import ContactBriefClient from './ContactBriefClient';

interface PageProps {
  params: {
    contactId: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function ContactBriefPage({ params }: PageProps) {
  const { contactId } = params;

  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const supabase = await createServerClient();

  // Query report that matches either the contact_id or the report's UUID
  const { data: report } = await supabase
    .from('ai_research_reports')
    .select('*')
    .eq('workspace_id', workspaceId)
    .or(`contact_id.eq.${contactId},id.eq.${contactId}`)
    .limit(1)
    .maybeSingle();

  if (!report) {
    redirect('/ai-studio/research');
  }

  return (
    <MetaData pageTitle="Prospect Intelligence Report">
      <ContactBriefClient 
        workspaceId={workspaceId} 
        report={report} 
      />
    </MetaData>
  );
}
