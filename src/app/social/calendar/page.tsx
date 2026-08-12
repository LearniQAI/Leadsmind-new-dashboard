import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { CalendarDays } from 'lucide-react';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';

export default function SocialCalendarPage() {
 return (
  <MetaData pageTitle="Social Calendar">
   <Wrapper>
    <div className="p-6 max-w-5xl mx-auto font-body min-h-[calc(100vh-100px)]">
     <div className="mb-6">
      <h1 className="text-3xl font-bold !text-dash-text">Social <span className="text-dash-accent">calendar</span></h1>
      <p className="!text-dash-textMuted text-[12px] font-medium mt-2">
       A unified scheduling calendar across every connected platform.
      </p>
     </div>
     <DashCard padding="default">
      <DashEmptyState
       icon={CalendarDays}
       title="Coming soon"
       description="The unified social scheduling calendar is on the roadmap. Scheduled posts will show here across all connected platforms."
      />
     </DashCard>
    </div>
   </Wrapper>
  </MetaData>
 );
}
