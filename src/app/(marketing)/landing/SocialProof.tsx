'use client';

import React from 'react';
import { stats, trustedLogos } from './data';
import { useCountUp } from './hooks';
import { SectionReveal } from './motion';

function Stat({ value, suffix, label, decimals }: any) {
  const { ref, value: animated } = useCountUp(value, { decimals });
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-[#0F172A] tabular-nums">
        {animated}
        {suffix}
      </div>
      <div className="mt-1 text-sm font-medium text-[#64748B]">{label}</div>
    </div>
  );
}

export default function SocialProof() {
  const loop = [...trustedLogos, ...trustedLogos];

  return (
    <section className="py-20 bg-white border-b border-[#E2E8F0]">
      <SectionReveal className="container mx-auto px-6">
        <p className="text-center text-xs font-bold uppercase tracking-[0.25em] !text-[#64748B] mb-10">
          Trusted by growing businesses across Africa
        </p>

        <div className="relative overflow-hidden mb-16 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max lm-marquee-track">
            {loop.map((logo, i) => (
              <span
                key={i}
                className="mx-10 text-2xl font-bold tracking-tight text-[#64748B]/40 grayscale whitespace-nowrap select-none"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
          {stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      </SectionReveal>
    </section>
  );
}
