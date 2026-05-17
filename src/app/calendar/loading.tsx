'use client';

import React from 'react';
import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { CalendarSkeleton } from '@/components/calendar/skeletons/CalendarSkeleton';

export default function CalendarLoading() {
  return (
    <MetaData pageTitle="Calendar Hub">
      <Wrapper>
        <main className="min-h-screen bg-[var(--n900)] text-[var(--t1)]">
          <CalendarSkeleton />
        </main>
      </Wrapper>
    </MetaData>
  );
}
