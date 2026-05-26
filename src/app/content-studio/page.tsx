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
      <div className="p-6 max-w-7xl mx-auto text-center bg-[#04091a] min-h-screen flex items-center justify-center">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 font-medium text-sm">
          Failed to load Content Studio command center: {error}
        </div>
      </div>
    );
  }

  return <ContentStudioHomeClient initialDocuments={documents || []} />;
}
