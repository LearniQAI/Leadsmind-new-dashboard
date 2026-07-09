import React from 'react';
import type { Metadata } from 'next';
import { getPublicBlogPosts, getPublicCategories, getBlogSettings } from '@/app/actions/publicBlog';
import PublicBlogClient from './PublicBlogClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Growth frameworks, CRM playbooks, and business tips for South African small and medium businesses, from the LeadsMind team.',
  alternates: { canonical: '/blog' },
  robots: { index: true, follow: true },
};

export default async function PublicBlogHubPage() {
  // Query all published posts and categories in this workspace
  const { data: posts, error: postsError } = await getPublicBlogPosts();
  const { data: categories, error: catError } = await getPublicCategories();
  
  // Resolve settings (if we have posts, use workspace_id of the first, otherwise falls back to active workspace)
  const firstPostWorkspaceId = posts?.[0]?.workspace_id;
  const { data: settings } = await getBlogSettings(firstPostWorkspaceId || '');

  if (postsError || catError) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center bg-[#04091a] min-h-screen flex items-center justify-center">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 font-medium text-sm">
          Failed to load corporate insights: {postsError || catError}
        </div>
      </div>
    );
  }

  return <PublicBlogClient posts={posts || []} categories={categories || []} settings={settings} />;
}
