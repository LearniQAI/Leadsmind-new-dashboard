import React from 'react';
import { getPosts, getCategories } from '@/app/actions/blog';
import BlogManagementClient from '../BlogManagementClient';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function BlogAdminPage() {
  await requireAuth();

  const { data: posts, error: postsError } = await getPosts();
  const { data: categories, error: catError } = await getCategories();

  if (postsError || catError) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-center bg-white min-h-screen flex items-center justify-center">
        <div className="p-4 bg-red/10 border border-red/20 rounded-xl text-red font-medium text-sm">
          Failed to load blog command center: {postsError || catError}
        </div>
      </div>
    );
  }

  return <BlogManagementClient initialPosts={posts || []} categories={categories || []} />;
}
