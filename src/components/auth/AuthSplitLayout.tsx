'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const trustPoints = [
  'ZAR pricing — no USD surprises',
  '14-day free trial included',
  'African businesses support team',
];

interface AuthSplitLayoutProps {
  headline: React.ReactNode;
  formHeading: string;
  formSubheading: string;
  children: React.ReactNode;
}

export default function AuthSplitLayout({ headline, formHeading, formSubheading, children }: AuthSplitLayoutProps) {
  return (
    <div className="h-screen w-full flex overflow-hidden">
      {/* Left brand column — hidden on mobile */}
      <div
        className="hidden md:flex md:w-[40%] h-full relative flex-col justify-between overflow-hidden p-8"
        style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1a1060 40%, #0F172A 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <Link href="/" className="relative z-10 w-fit">
          <Image
            src="/assets/images/brand/LeadsMind_Logo.png.png"
            alt="LeadsMind"
            width={140}
            height={36}
            className="object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </Link>

        <div className="relative z-10">
          <h1 className="!font-extrabold !text-white leading-[1.3]" style={{ fontSize: 32, maxWidth: 280 }}>
            {headline}
          </h1>
          <p className="mt-3 text-sm !text-white/70">
            The all-in-one business OS
            <br />
            built for African businesses.
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          {trustPoints.map((point) => (
            <div key={point} className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white text-xs">
                ✓
              </div>
              <span className="text-[13px] font-medium !text-white/85">{point}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form column */}
      <div className="flex w-full h-full items-center justify-center overflow-y-auto bg-white px-6 py-6 md:w-[60%] md:px-10">
        <div className="w-full max-w-[380px] py-4">
          <div className="mb-6 flex justify-center md:hidden">
            <Image
              src="/assets/images/brand/LeadsMind_Logo.png.png"
              alt="LeadsMind"
              width={140}
              height={36}
              className="object-contain"
            />
          </div>

          <h2 className="mb-1.5 text-2xl font-extrabold !text-[#0F172A]">{formHeading}</h2>
          <p className="mb-5 text-sm !text-[#64748B]">{formSubheading}</p>

          {children}
        </div>
      </div>
    </div>
  );
}
