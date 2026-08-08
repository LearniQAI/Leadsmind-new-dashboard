import React from 'react';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { listBulkSmsCampaigns } from '@/app/actions/bulk_sms';
import { listSegments } from '@/app/actions/segments';
import SmsClient from './SmsClient';

export const dynamic = 'force-dynamic';

export default async function BulkSmsPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const [campaignsRes, segmentsRes] = await Promise.all([listBulkSmsCampaigns(), listSegments()]);
  const campaigns = campaignsRes.success ? campaignsRes.data : [];
  const segments = segmentsRes.success ? segmentsRes.data : [];

  return (
    <MetaData pageTitle="Bulk SMS">
      <Wrapper>
        <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
          <SmsClient initialCampaigns={campaigns} segments={segments} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
