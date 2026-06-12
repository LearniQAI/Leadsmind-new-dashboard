import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { createAdminClient } from '@/lib/supabase/server';
import LiveBuilderClient from './LiveBuilderClient';

interface PageProps {
  params: {
    id: string; // workspaceId
  };
}

export default async function WorkspaceLiveBuilderPage({ params }: PageProps) {
  const workspaceId = params.id;
  const adminClient = createAdminClient();

  // Fetch expert profiles to show in landing page previews
  const { data: experts } = await adminClient
    .from('lms_expert_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });

  // Fetch courses to allow selecting which course scheduler is bound to
  const { data: courses } = await adminClient
    .from('courses')
    .select('id, title')
    .eq('workspace_id', workspaceId)
    .order('title', { ascending: true });

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] text-white">
        <LiveBuilderClient
          workspaceId={workspaceId}
          experts={experts || []}
          courses={courses || []}
        />
      </div>
    </Wrapper>
  );
}
