'use client';

import React from 'react';
import Link from 'next/link';
import { DashButton } from '@/components/dashboard-ui';

/** Sticky bottom CTA bar shared across all Solutions module pages. */
export default function StickyFooterCtaBand() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E2E8F0] bg-white/80 backdrop-blur-md shadow-[0_-4px_24px_rgba(15,23,42,0.06)]">
      <div className="container mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3">
        <span className="text-sm font-semibold !text-[#0F172A] text-center sm:text-left">
          One platform. Every module. Built for Africa.
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/auth/signup-basic">
            <DashButton variant="primary" size="sm">
              Start Free
            </DashButton>
          </Link>
          <Link href="/#demo">
            <DashButton variant="ghost" size="sm">
              Book a Demo
            </DashButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
