'use client';

import React from 'react';
import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { TasksBoardSkeleton } from '@/components/kanban/skeletons/TasksBoardSkeleton';

export default function TasksLoading() {
  return (
    <MetaData pageTitle="Tasks Board">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white select-none">
          {/* Header Section Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-6 pt-2">
            <div className="space-y-2">
              <div className="h-9 w-60 rounded-lg bg-dash-surface animate-pulse shadow-none border border-transparent" />
              <div className="h-3.5 w-80 rounded bg-dash-surface animate-pulse shadow-none border border-transparent" />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-dash-surface p-1 rounded-xl border border-dash-border">
                <div className="w-24 h-8 rounded-lg bg-dash-surface animate-pulse shadow-none border border-transparent mr-2" />
                <div className="w-24 h-8 rounded-lg bg-dash-surface animate-pulse shadow-none border border-transparent" />
              </div>
            </div>
          </div>

          {/* Kanban Toolbar Skeleton */}
          <div className="px-6 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-dash-surface border border-dash-border">
              <div className="h-10 w-full md:w-80 rounded-lg bg-dash-surface animate-pulse shadow-none border border-transparent" />
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="h-10 w-24 rounded-lg bg-dash-surface animate-pulse shadow-none border border-transparent" />
                <div className="h-10 w-28 rounded-lg bg-dash-surface animate-pulse shadow-none border border-transparent" />
              </div>
            </div>
          </div>

          {/* Kanban Board Skeleton */}
          <div className="flex-1 overflow-hidden">
            <TasksBoardSkeleton />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
