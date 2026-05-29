import React from 'react';
import { notFound } from 'next/navigation';
import { getPublicReputationSettings } from '@/app/actions/reputation_actions';
import FeedbackClient from './FeedbackClient';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ workspaceId?: string; contactId?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { workspaceId } = await searchParams;
  if (!workspaceId) {
    return { title: 'Feedback Portal' };
  }
  const res = await getPublicReputationSettings(workspaceId);
  const name = res.data?.workspace_name || 'LeadsMind Portal';
  return {
    title: `Share Your Feedback — ${name}`,
    robots: { index: false, follow: false },
  };
}

export default async function FeedbackPage({ searchParams }: Props) {
  const { workspaceId, contactId } = await searchParams;

  if (!workspaceId) {
    notFound();
  }

  const res = await getPublicReputationSettings(workspaceId);
  if (res.error || !res.data) {
    notFound();
  }

  return (
    <FeedbackClient 
      workspaceId={workspaceId} 
      contactId={contactId || ''} 
      settings={res.data} 
    />
  );
}
