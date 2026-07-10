'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { pricingTiers } from './data';
import { SectionReveal } from './motion';

function CheckIcon({ bg, stroke }: { bg: string; stroke: string }) {
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
      style={{ background: bg }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M2 5l2 2 4-4" stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const valueStatement = [
  '14-day free trial',
  'No credit card required',
  'PayFast & Stripe accepted',
  'SA support team',
];

const cardContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};

const cardPop = {
  hidden: { opacity: 0, y: 48, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function Pricing({ onSelectTier }: { onSelectTier: (tierId: string, interval: 'month' | 'year') => void }) {
  const [isAnnual, setIsAnnual] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const backgroundY = useTransform(scrollYProgress, [0, 1], [-60, 60]);

  return (
    <section id="pricing" ref={sectionRef} className="relative overflow-hidden bg-white py-28">
      <motion.div
        style={{ y: backgroundY, background: 'radial-gradient(ellipse 1000px 400px at 50% -50px, rgba(99, 102, 241, 0.06), transparent 70%)' }}
        className="absolute top-0 left-0 right-0 h-[400px] pointer-events-none"
      />

      <div className="container mx-auto px-6 relative z-10">
        <SectionReveal>
        <div className="text-center mb-4">
          <span className="inline-block bg-[#EEF2FF] !text-[#4F46E5] border border-[#C7D2FE] font-bold uppercase tracking-[0.1em] text-xs px-4 py-1.5 rounded-full mb-5">
            Simple Pricing
          </span>
          <h2 className="text-[clamp(32px,4vw,52px)] font-extrabold !text-[#0F172A] leading-tight tracking-[-0.02em] mb-4">
            One plan. Every module. No surprises.
          </h2>
          <p className="text-[16px] !text-[#64748B] mb-8">Priced in ZAR for African businesses</p>

          <div className="inline-flex items-center gap-0.5 p-1 rounded-full bg-[#F1F5F9] my-8">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                !isAnnual ? 'bg-white !text-[#0F172A] shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : '!text-[#64748B] hover:!text-[#0F172A]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`flex items-center px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                isAnnual ? 'bg-white !text-[#0F172A] shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : '!text-[#64748B] hover:!text-[#0F172A]'
              }`}
            >
              Annual
              <span
                className="!text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-1.5"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                -20%
              </span>
            </button>
          </div>
        </div>

        <motion.div
          variants={cardContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="flex flex-col lg:flex-row lg:flex-wrap justify-center gap-6 max-w-[480px] lg:max-w-[1100px] mx-auto items-start"
        >
          {pricingTiers.map((tier) => {
            const hasAnnual = tier.price_zar_annual != null && tier.price_zar_annual_monthly_equiv != null;
            const showAnnual = isAnnual && hasAnnual;
            const price = showAnnual ? tier.price_zar_annual_monthly_equiv! : tier.monthlyPrice;
            const isPro = !!tier.highlighted;
            const isEnterprise = tier.id === 'dynasty';

            return (
              <motion.div
                key={tier.id}
                variants={cardPop}
                className={`w-full lg:flex-none lg:basis-[calc(33.333%-16px)] ${isPro ? 'mt-0 lg:-mt-4' : ''}`}
              >
                <div
                  className={`relative rounded-[24px] p-9 h-full transition-all duration-300 ${
                    isPro
                      ? 'pro-card-glow border border-[rgba(99,102,241,0.3)] shadow-[0_0_0_1px_rgba(99,102,241,0.2),0_24px_60px_rgba(99,102,241,0.2),0_8px_24px_rgba(0,0,0,0.2)]'
                      : 'bg-white border border-[#E2E8F0] shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:-translate-y-0.5'
                  }`}
                  style={isPro ? { background: 'linear-gradient(160deg, #0F172A 0%, #1a1060 40%, #0F172A 100%)' } : undefined}
                >
                  {isPro && (
                    <span
                      className="absolute -top-px left-1/2 -translate-x-1/2 !text-white text-[11px] font-bold uppercase tracking-[0.08em] px-5 py-1.5 rounded-b-xl shadow-[0_4px_12px_rgba(79,70,229,0.4)]"
                      style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
                    >
                      Most Popular
                    </span>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-xl font-extrabold mb-1 ${isPro ? '!text-white mt-5' : '!text-[#0F172A]'}`}>
                      {tier.name}
                    </h3>
                    {showAnnual && (
                      <span
                        className={`!text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${isPro ? 'mt-5' : ''}`}
                        style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                      >
                        Save {tier.annual_discount_pct}%
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${isPro ? '!text-[#94A3B8]' : '!text-[#64748B]'}`}>{tier.description}</p>

                  <div
                    className="my-6 py-6"
                    style={{ borderTop: `1px solid ${isPro ? 'rgba(255,255,255,0.08)' : '#F1F5F9'}`, borderBottom: `1px solid ${isPro ? 'rgba(255,255,255,0.08)' : '#F1F5F9'}` }}
                  >
                    <div>
                      <span
                        className={`text-[48px] font-black tracking-[-0.02em] tabular-nums ${isPro ? '!text-white' : ''}`}
                        style={
                          isEnterprise
                            ? {
                                backgroundImage: 'linear-gradient(135deg, #0F172A, #334155)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                              }
                            : isPro
                            ? undefined
                            : { color: '#0F172A' }
                        }
                      >
                        R{price.toLocaleString('en-ZA')}
                      </span>
                      <span className={`text-sm ml-1 ${isPro ? '!text-[#64748B]' : '!text-[#94A3B8]'}`}>/{showAnnual ? 'mo' : 'month'}</span>
                    </div>
                    {showAnnual && (
                      <div className={`text-xs mt-1.5 ${isPro ? '!text-[#64748B]' : '!text-[#94A3B8]'}`}>
                        billed R{tier.price_zar_annual!.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/year
                      </div>
                    )}
                  </div>

                  <ul className="flex flex-col gap-3.5 mb-7">
                    {tier.features.map((f) => (
                      <li
                        key={f}
                        className={`flex items-center gap-3 text-sm ${isPro ? '!text-[#CBD5E1]' : '!text-[#475569]'}`}
                      >
                        <CheckIcon
                          bg={isPro ? 'rgba(99, 102, 241, 0.2)' : '#F0FDF4'}
                          stroke={isPro ? '#818CF8' : '#10B981'}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isEnterprise ? (
                    <Link href="/contact">
                      <Button className="w-full h-[50px] rounded-xl font-bold text-[15px] bg-[#0F172A] hover:bg-[#1E293B] !text-white transition-colors">
                        {tier.cta}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => onSelectTier(tier.id, isAnnual ? 'year' : 'month')}
                      className={`w-full h-[50px] rounded-xl font-bold text-[15px] transition-all ${
                        isPro
                          ? 'lm-shimmer !text-white shadow-[0_4px_16px_rgba(79,70,229,0.4)] hover:shadow-[0_8px_24px_rgba(79,70,229,0.5)] hover:-translate-y-px'
                          : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] !text-[#0F172A]'
                      }`}
                      style={isPro ? { background: 'linear-gradient(135deg, #4F46E5, #6366F1)' } : undefined}
                    >
                      {tier.cta}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="text-center mt-12 pt-12 border-t border-[#F1F5F9]">
          <p className="!text-[#94A3B8] text-sm mb-4">All prices in ZAR · VAT exclusive · Cancel anytime</p>
          <div className="flex justify-center gap-8 flex-wrap">
            {valueStatement.map((item) => (
              <span key={item} className="flex items-center gap-2 text-[13px] font-medium !text-[#64748B]">
                <span className="!text-[#10B981]">✓</span> {item}
              </span>
            ))}
          </div>
        </div>
        </SectionReveal>
      </div>
    </section>
  );
}
