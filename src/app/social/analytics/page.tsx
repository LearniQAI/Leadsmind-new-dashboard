import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { ChartLine } from 'lucide-react';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';

export default function SocialAnalyticsPage() {
 return (
  <MetaData pageTitle="Social Analytics">
   <Wrapper>
    <div className="p-6 max-w-5xl mx-auto font-body min-h-[calc(100vh-100px)]">
     <div className="mb-6">
      <h1 className="text-3xl font-bold !text-dash-text">Social <span className="text-dash-accent">analytics</span></h1>
      <p className="!text-dash-textMuted text-[12px] font-medium mt-2">
       Engagement analytics across every connected platform.
      </p>
     </div>
     <DashCard padding="default">
      <DashEmptyState
       icon={ChartLine}
       title="Coming soon"
       description="Engagement analytics for connected platforms is on the roadmap."
      />
     </DashCard>
    </div>
   </Wrapper>
  </MetaData>
 );
}
