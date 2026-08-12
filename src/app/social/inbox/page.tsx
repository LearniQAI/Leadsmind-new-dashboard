import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { MessagesSquare } from 'lucide-react';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';

export default function SocialInboxPage() {
 return (
  <MetaData pageTitle="Social Inbox">
   <Wrapper>
    <div className="p-6 max-w-5xl mx-auto font-body min-h-[calc(100vh-100px)]">
     <div className="mb-6">
      <h1 className="text-3xl font-bold !text-dash-text">Social <span className="text-dash-accent">inbox</span></h1>
      <p className="!text-dash-textMuted text-[12px] font-medium mt-2">
       Comments and mentions across every connected platform, in one place.
      </p>
     </div>
     <DashCard padding="default">
      <DashEmptyState
       icon={MessagesSquare}
       title="Coming soon"
       description="Comment and mention management for connected platforms is on the roadmap."
      />
     </DashCard>
    </div>
   </Wrapper>
  </MetaData>
 );
}
