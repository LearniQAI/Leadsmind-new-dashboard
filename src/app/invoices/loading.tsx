'use client';

import React from 'react';
import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { InvoicesSkeleton } from '@/components/invoices/skeletons/InvoicesSkeleton';

export default function InvoicesLoading() {
  return (
    <MetaData pageTitle="Billing Ledger">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white overflow-hidden">
          {/* Header Section Skeleton */}
          <div className="flex px-6 py-6 shrink-0 bg-white border-b border-dash-border select-none">
            <div className="flex justify-between items-center w-full">
              <div className="space-y-2">
                <div className="h-8 w-44 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-transparent" />
                <div className="h-3 w-56 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-transparent" />
              </div>
              <div className="h-12 w-36 rounded-lg bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-transparent" />
            </div>
          </div>

          {/* Master Detail Grid Skeleton */}
          <div className="flex-1 bg-white">
            <InvoicesSkeleton />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
