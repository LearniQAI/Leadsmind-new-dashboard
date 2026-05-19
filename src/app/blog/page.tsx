import React from 'react';
import { getPublicBlogPosts, getPublicCategories } from '@/app/actions/publicBlog';
import PublicBlogClient from './PublicBlogClient';

export const dynamic = 'force-dynamic';

export default async function PublicBlogHubPage() {
  // Query all published posts and categories in this workspace
  const { data: posts, error: postsError } = await getPublicBlogPosts();
  const { data: categories, error: catError } = await getPublicCategories();

  if (postsError || catError) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center bg-[#04091a] min-h-screen flex items-center justify-center">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 font-medium text-sm">
          Failed to load corporate insights: {postsError || catError}
        </div>
      </div>
    );
  }

  return <PublicBlogClient posts={posts || []} categories={categories || []} />;
}
