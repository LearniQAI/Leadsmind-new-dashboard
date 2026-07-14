import React from 'react';
import { requireAuth } from '@/lib/auth';
import { getDocuments } from '@/app/actions/contentStudio';
import ContentStudioHomeClient from './ContentStudioHomeClient';
export const dynamic = 'force-dynamic';

export default async function ContentStudioPage() {
  await requireAuth();

  const { data: documents, error } = await getDocuments();

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-center bg-white min-h-screen flex items-center justify-center">
        <div className="p-4 bg-red/10 border border-red/20 rounded-xl text-red font-medium text-sm">
          Failed to load Content Studio: {error}
        </div>
      </div>
    );
  }

  return <ContentStudioHomeClient initialDocuments={documents || []} />;
}
