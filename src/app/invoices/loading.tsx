'use client';

import React from 'react';
import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { InvoicesSkeleton } from '@/components/invoices/skeletons/InvoicesSkeleton';

export default function InvoicesLoading() {
  return (
    <MetaData pageTitle="Billing Ledger">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[var(--n900)] overflow-hidden">
          {/* Header Section Skeleton */}
          <div className="page-header px-6 py-6 flex-shrink-0 bg-[var(--n900)] border-b border-white/5 select-none">
            <div className="flex justify-between items-center w-full">
              <div className="space-y-2">
                <div className="h-8 w-44 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                <div className="h-3 w-56 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              </div>
              <div className="h-12 w-36 rounded-lg bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            </div>
          </div>

          {/* Master Detail Grid Skeleton */}
          <div className="flex-1 bg-[var(--n900)]">
            <InvoicesSkeleton />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
