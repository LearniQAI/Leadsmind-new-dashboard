import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BlogCommentsClient from './BlogCommentsClient';

export default async function BlogCommentsPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/login');

  const supabase = await createServerClient();

  const { data: comments } = await supabase.from('blog_comments')
    .select('*, post:blog_posts(id, title, slug)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  const { data: settings } = await supabase.from('blog_settings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  return (
    <MetaData pageTitle="Comments Moderation">
      <Wrapper>
        <BlogCommentsClient 
          initialComments={comments || []} 
          settings={settings || { comments_engine: 'native', analytics_enabled: true }}
          workspaceId={workspaceId}
        />
      </Wrapper>
    </MetaData>
  );
}
