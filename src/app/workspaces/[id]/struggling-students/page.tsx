import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { createAdminClient } from '@/lib/supabase/server';
import StrugglingStudentsClient from './StrugglingStudentsClient';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function WorkspaceStrugglingStudentsPage({ params }: PageProps) {
  const workspaceId = params.id;
  const adminClient = createAdminClient();

  // Query all struggle scores for this workspace, mapping contact and course details
  const { data: scores } = await adminClient
    .from('lms_student_struggle_scores')
    .select(`
      id,
      score,
      quiz_failure_rate_points,
      score_vector_points,
      passing_delta_points,
      time_multiplier_points,
      dropout_trends_points,
      reasons,
      updated_at,
      contact:contacts (
        id,
        first_name,
        last_name,
        email
      ),
      course:courses (
        id,
        title
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('score', { ascending: false });

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] text-white">
        <StrugglingStudentsClient initialScores={scores || []} workspaceId={workspaceId} />
      </div>
    </Wrapper>
  );
}
