import React from 'react';
import { requireAuth } from '@/lib/auth';
import { getDocument, getDocumentVersions } from '@/app/actions/contentStudio';
import { notFound } from 'next/navigation';
import ContentStudioWorkspaceClient from '../ContentStudioWorkspaceClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function ContentStudioEditPage({ params }: PageProps) {
  await requireAuth();

  const { data: document, error } = await getDocument(params.id);
  const { data: versions } = await getDocumentVersions(params.id);

  if (error || !document) {
    return notFound();
  }

  return (
    <ContentStudioWorkspaceClient
      initialDocument={document}
      initialVersions={versions || []}
    />
  );
}
