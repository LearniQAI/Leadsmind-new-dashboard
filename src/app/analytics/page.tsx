import React from 'react';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import AnalyticsClient from './AnalyticsClient';
import { getDashboardStats } from '@/app/actions/analytics';

export default async function AnalyticsPage() {
  const { data: stats, error } = await getDashboardStats();

  return (
    <MetaData pageTitle="Reporting & Analytics">
      <Wrapper>
        <div className="app__slide-wrapper">
          <AnalyticsClient stats={stats || { leads: 0, orders: 0, tasks: 0, conversations: 0 }} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
