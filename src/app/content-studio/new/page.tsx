import React from 'react';
import { requireAuth } from '@/lib/auth';
import ContentStudioWorkspaceClient from '../ContentStudioWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function ContentStudioNewPage() {
  await requireAuth();
  return <ContentStudioWorkspaceClient initialDocument={null} initialVersions={[]} />;
}
