import React from 'react';
import { getPostDetails, getCategories } from '@/app/actions/blog';
import BlogEditorClient from './BlogEditorClient';
import { requireAuth } from '@/lib/auth';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function BlogEditorPage({ params }: PageProps) {
  // Ensure the user is authenticated
  await requireAuth();

  // Fetch the current post details
  const { data: post, error: postError } = await getPostDetails(params.id);
  
  if (postError || !post) {
    return notFound();
  }

  // Fetch available categories in the active workspace
  const { data: categories, error: catError } = await getCategories();

  if (catError) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-center bg-white min-h-screen flex items-center justify-center">
        <div className="p-4 bg-red/10 border border-red/20 rounded-xl text-red font-medium text-sm">
          Failed to load blog workspace: {catError}
        </div>
      </div>
    );
  }

  return <BlogEditorClient post={post} categories={categories || []} />;
}
