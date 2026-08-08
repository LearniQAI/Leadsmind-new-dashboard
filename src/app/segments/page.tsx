import React from 'react';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { listSegments } from '@/app/actions/segments';
import SegmentsClient from './SegmentsClient';

export const dynamic = 'force-dynamic';

export default async function SegmentsPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const segmentsRes = await listSegments();
  const segments = segmentsRes.success ? segmentsRes.data : [];

  return (
    <MetaData pageTitle="Segments">
      <Wrapper>
        <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
          <SegmentsClient initialSegments={segments} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
