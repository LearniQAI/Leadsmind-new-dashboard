import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BlogAnalyticsClient from './BlogAnalyticsClient';

export default async function BlogAnalyticsPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const supabase = await createServerClient();

  // Fetch posts for joining
  const { data: posts } = await supabase.from('blog_posts')
    .select('id, title, slug, published_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'published');

  // Fetch pageviews
  const { data: pageviews } = await supabase.from('blog_pageviews')
    .select('*')
    .eq('workspace_id', workspaceId);

  // Parse analytics
  const analyticsData = {
    totalViews: pageviews?.length || 0,
    uniqueVisitors: new Set(pageviews?.map(p => p.visitor_id)).size,
    avgTime: pageviews && pageviews.length > 0 ? Math.round(pageviews.reduce((acc, p) => acc + (p.time_spent || 0), 0) / pageviews.length) : 0,
    avgScroll: pageviews && pageviews.length > 0 ? Math.round(pageviews.reduce((acc, p) => acc + (p.scroll_depth || 0), 0) / pageviews.length) : 0,
  };

  // Top posts
  const postStats = (posts || []).map(post => {
    const postViews = (pageviews || []).filter(p => p.post_id === post.id);
    return {
      ...post,
      views: postViews.length,
      unique: new Set(postViews.map(p => p.visitor_id)).size,
      time: postViews.length > 0 ? Math.round(postViews.reduce((acc, p) => acc + (p.time_spent || 0), 0) / postViews.length) : 0,
      scroll: postViews.length > 0 ? Math.round(postViews.reduce((acc, p) => acc + (p.scroll_depth || 0), 0) / postViews.length) : 0
    };
  }).sort((a, b) => b.views - a.views);

  // Channels
  const channels = (pageviews || []).reduce((acc: any, curr) => {
    const src = curr.source?.includes('http') ? new URL(curr.source).hostname : (curr.source || 'Direct');
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});
  
  const topChannels = Object.entries(channels).map(([name, count]) => ({ name, count: count as number })).sort((a, b) => b.count - a.count);

  return (
    <MetaData pageTitle="Blog Analytics">
      <Wrapper>
        <BlogAnalyticsClient stats={analyticsData} topPosts={postStats} channels={topChannels} />
      </Wrapper>
    </MetaData>
  );
}
