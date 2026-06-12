import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { createAdminClient } from '@/lib/supabase/server';
import AutomationsClient from '../../../courses/[id]/automations/AutomationsClient';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function WorkspaceAutomationsPage({ params }: PageProps) {
  const workspaceId = params.id;
  const adminClient = createAdminClient();

  // Fetch course context corresponding to active workspace
  const { data: course } = await adminClient
    .from('courses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .limit(1)
    .maybeSingle();

  if (!course) {
    return (
      <Wrapper>
        <div className="p-12 text-center text-white font-mono text-xs uppercase tracking-widest bg-[#080f28] rounded-3xl border border-white/5">
          No course context exists for this active workspace. Setup a course node first.
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] text-white">
        <AutomationsClient course={course} />
      </div>
    </Wrapper>
  );
}
