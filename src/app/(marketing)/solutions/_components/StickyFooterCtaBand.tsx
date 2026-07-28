'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
            <Button
              size="sm"
              className="h-10 px-5 text-sm text-white rounded-[10px] font-bold"
              style={{ backgroundColor: '#FF8A00' }}
            >
              Start Free
            </Button>
          </Link>
          <Link
            href="/#demo"
            className="h-10 px-5 rounded-[10px] border border-[#0F172A]/15 !text-[#0F172A] inline-flex items-center justify-center font-semibold text-sm hover:bg-[#0F172A]/5 transition-colors"
          >
            Book a Demo
          </Link>
        </div>
      </div>
    </div>
  );
}
