import React from 'react';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { listWhatsAppBroadcastCampaigns } from '@/app/actions/whatsapp_broadcast';
import { listWhatsAppBotRules } from '@/app/actions/whatsapp_bot_rules';
import { listSegments } from '@/app/actions/segments';
import WhatsappBroadcastsClient from './WhatsappBroadcastsClient';

export const dynamic = 'force-dynamic';

export default async function WhatsAppBroadcastsPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const [campaignsRes, rulesRes, segmentsRes] = await Promise.all([
    listWhatsAppBroadcastCampaigns(),
    listWhatsAppBotRules(),
    listSegments(),
  ]);
  const campaigns = campaignsRes.success ? campaignsRes.data : [];
  const rules = rulesRes.success ? rulesRes.data : [];
  const segments = segmentsRes.success ? segmentsRes.data : [];

  return (
    <MetaData pageTitle="WhatsApp Broadcasts">
      <Wrapper>
        <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
          <WhatsappBroadcastsClient initialCampaigns={campaigns} initialRules={rules} segments={segments} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
