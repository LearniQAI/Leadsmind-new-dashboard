import React from 'react';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import ReviewsWidgetClient from './ReviewsWidgetClient';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ workspaceId?: string }>;
}

export default async function ReviewsWidgetPage({ searchParams }: Props) {
  const { workspaceId } = await searchParams;

  if (!workspaceId) {
    notFound();
  }

  const supabase = createAdminClient();
  const { data: reviews, error } = await supabase
    .from('reputation_reviews')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('rating', 4)
    .order('created_at', { ascending: false });

  if (error) {
    notFound();
  }

  const mappedReviews = reviews?.map(r => ({
    id: r.id,
    reviewer_name: r.reviewer_name,
    rating: r.rating,
    body: r.review_text,
    platform: r.platform,
    review_date: r.published_at || r.created_at
  })) || [];

  return (
    <ReviewsWidgetClient reviews={mappedReviews} />
  );
}
