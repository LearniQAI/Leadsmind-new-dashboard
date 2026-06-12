import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { createAdminClient } from '@/lib/supabase/server';
import ExpertsClient from './ExpertsClient';

interface PageProps {
  params: {
    id: string; // workspaceId
  };
}

export default async function WorkspaceExpertsPage({ params }: PageProps) {
  const workspaceId = params.id;
  const adminClient = createAdminClient();

  // Fetch all expert profiles for this workspace
  const { data: experts } = await adminClient
    .from('lms_expert_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });

  // Fetch all courses for this workspace to link expert sessions
  const { data: courses } = await adminClient
    .from('courses')
    .select('id, title')
    .eq('workspace_id', workspaceId)
    .order('title', { ascending: true });

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] text-white">
        <ExpertsClient
          workspaceId={workspaceId}
          initialExperts={experts || []}
          courses={courses || []}
        />
      </div>
    </Wrapper>
  );
}
