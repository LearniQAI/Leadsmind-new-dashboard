import React from 'react';
import type { Metadata } from 'next';
import { getPublicBlogPosts, getPublicCategories, getBlogSettings } from '@/app/actions/publicBlog';
import PublicBlogClient from './PublicBlogClient';
import { resolveTenantSiteBrand } from '@/lib/blog/publicWorkspace';

export const dynamic = 'force-dynamic';

const platformMetadata: Metadata = {
  title: 'Blog',
  description: 'Growth frameworks, CRM playbooks, and business tips for South African small and medium businesses, from the LeadsMind team.',
  alternates: { canonical: '/blog' },
  robots: { index: true, follow: true },
};

// On a tenant's own domain the blog hub is titled with that workspace's name (title.absolute
// bypasses the root layout's "| LeadsMind" template) and canonicalises to the tenant's own
// origin. The default platform domain keeps the metadata above unchanged.
export async function generateMetadata(): Promise<Metadata> {
  const tenant = await resolveTenantSiteBrand();
  if (!tenant) return platformMetadata;
  const name = tenant.workspaceName;
  return {
    ...platformMetadata,
    title: { absolute: name ? `Blog | ${name}` : 'Blog' },
    description: name ? `Articles and insights from ${name}.` : 'Articles and insights.',
    alternates: { canonical: `${tenant.origin}/blog` },
  };
}

export default async function PublicBlogHubPage() {
  // Query all published posts and categories in this workspace
  const { data: posts, error: postsError } = await getPublicBlogPosts();
  const { data: categories, error: catError } = await getPublicCategories();
  
  // Resolve settings (if we have posts, use workspace_id of the first, otherwise falls back to active workspace)
  const firstPostWorkspaceId = posts?.[0]?.workspace_id;
  const { data: settings } = await getBlogSettings(firstPostWorkspaceId || '');

  if (postsError || catError) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center bg-dash-bg min-h-screen flex items-center justify-center">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 font-medium text-sm">
          Failed to load corporate insights: {postsError || catError}
        </div>
      </div>
    );
  }

  return <PublicBlogClient posts={posts || []} categories={categories || []} settings={settings} />;
}
