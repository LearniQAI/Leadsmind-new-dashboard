'use client';

import React from 'react';
import MetaData from "@/hooks/useMetaData";
import Wrapper from "@/components/layouts/DefaultWrapper";
import { DashboardStatsSkeleton } from "@/components/dashboard/skeletons/DashboardStatsSkeleton";
import { DashboardQuickActionsSkeleton } from "@/components/dashboard/skeletons/DashboardQuickActionsSkeleton";
import { DashboardActivitySkeleton } from "@/components/dashboard/skeletons/DashboardActivitySkeleton";
import { DashboardDealsSkeleton } from "@/components/dashboard/skeletons/DashboardDealsSkeleton";

export default function DashboardLoading() {
  return (
    <MetaData pageTitle="Main Dashboard">
      <Wrapper>
        {/* Page Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-6 md:py-8 select-none">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-48 rounded-lg bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            <div className="h-3.5 w-72 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-28 rounded-xl bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            <div className="h-10 w-36 rounded-xl bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          </div>
        </div>

        {/* Quick Actions Bar Skeleton */}
        <DashboardQuickActionsSkeleton />

        {/* Main Content Grid Skeleton */}
        <div className="app__slide-wrapper p-6 select-none">
          <div className="grid grid-cols-12 gap-5">
            {/* 8 Stats Cards Skeletons */}
            <div className="col-span-12">
              <DashboardStatsSkeleton />
            </div>

            {/* Live Activity Feed Skeleton */}
            <div className="col-span-12 xxl:col-span-7">
              <DashboardActivitySkeleton />
            </div>

            {/* High-Value Deals Table Skeleton */}
            <div className="col-span-12 xxl:col-span-5">
              <DashboardDealsSkeleton />
            </div>
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
