'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pricingTiers } from './data';

export default function Pricing({ onSelectTier }: { onSelectTier: (tierId: string) => void }) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="py-28 bg-[#0F172A] relative overflow-hidden">
      <div className="absolute inset-0 lm-dot-grid opacity-30 pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="text-[#818CF8] font-bold uppercase tracking-[0.25em] text-xs mb-4">Simple Pricing</div>
          <h2 className="text-3xl md:text-5xl font-bold !text-white leading-tight mb-4">
            One plan. Every module. No surprises.
          </h2>
          <p className="!text-white/50 mb-8">Priced in ZAR for South African businesses</p>

          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                !isAnnual ? 'bg-white text-[#0F172A]' : 'text-white/50 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                isAnnual ? 'bg-[#4F46E5] text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              Annual <span className="text-xs ml-1 opacity-80">(-20%)</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {pricingTiers.map((tier, i) => {
            const price = isAnnual ? Math.round(tier.monthlyPrice * 0.8) : tier.monthlyPrice;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-2xl p-8 flex flex-col h-full ${
                  tier.highlighted
                    ? 'lm-glass lm-float border-2 border-[#4F46E5] shadow-2xl shadow-[#4F46E5]/30 md:scale-105 z-10'
                    : 'lm-glass border border-white/10'
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#4F46E5] text-white text-xs font-bold uppercase tracking-wide px-4 py-1.5 rounded-full shadow-lg shadow-[#4F46E5]/40">
                    Most Popular
                  </span>
                )}

                <h3 className="text-xl font-bold !text-white mb-1">{tier.name}</h3>
                <p className="!text-white/50 text-sm mb-6">{tier.description}</p>

                <div className="flex items-baseline gap-1.5 mb-8">
                  <span className="text-4xl font-bold text-white tabular-nums">R{price.toLocaleString('en-ZA')}</span>
                  <span className="text-white/40 text-sm">/month</span>
                </div>

                <ul className="space-y-3.5 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                      <span className="w-5 h-5 rounded-full bg-[#4F46E5]/20 text-[#818CF8] flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3px]" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {tier.id === 'enterprise' ? (
                  <Link href="/contact">
                    <Button className="w-full h-12 rounded-full font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15">
                      {tier.cta}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => onSelectTier(tier.id)}
                    className={`w-full h-12 rounded-full font-semibold ${
                      tier.highlighted
                        ? 'lm-shimmer bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white shadow-lg shadow-[#4F46E5]/30'
                        : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                    }`}
                  >
                    {tier.cta}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>

        <p className="text-center !text-white/30 text-xs mt-12">
          All prices in ZAR. VAT exclusive. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
