'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { moduleTabs } from './data';

export default function Solution() {
  const [active, setActive] = useState(0);
  const tab = moduleTabs[active];
  const Icon = tab.icon;

  return (
    <section id="modules" className="py-28 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <div className="text-[#4F46E5] font-bold uppercase tracking-[0.25em] text-xs mb-4">
            The Solution
          </div>
          <h2 className="text-3xl md:text-5xl font-bold !text-[#0F172A] leading-tight">
            Everything your business needs. One platform. One login.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-6xl mx-auto">
          <div className="lg:col-span-4 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 lm-scrollbar">
            {moduleTabs.map((m, i) => {
              const MIcon = m.icon;
              const isActive = i === active;
              return (
                <button
                  key={m.key}
                  onClick={() => setActive(i)}
                  className={`flex items-center gap-3 shrink-0 lg:w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? 'bg-[#EEF2FF] border-[#4F46E5]/30 shadow-sm'
                      : 'bg-white border-[#E2E8F0] hover:border-[#4F46E5]/20 hover:bg-[#EEF2FF]/50'
                  }`}
                >
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isActive ? `${m.accent}20` : '#F1F5F9', color: isActive ? m.accent : '#64748B' }}
                  >
                    <MIcon className="w-4.5 h-4.5" />
                  </span>
                  <span className={`text-sm font-semibold whitespace-nowrap ${isActive ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab.key}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="h-full rounded-2xl border border-[#E2E8F0] bg-[#EEF2FF]/40 p-8 md:p-10"
              >
                <div className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: tab.accent }}>
                  {tab.tag}
                </div>
                <h3 className="text-2xl font-bold !text-[#0F172A] mb-6">{tab.headline}</h3>

                <ul className="space-y-3 mb-8">
                  {tab.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-[#334155]">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${tab.accent}20`, color: tab.accent }}
                      >
                        <Check className="w-3 h-3 stroke-[3px]" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden mb-6">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#E2E8F0]">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]/60" />
                    <span className="w-2 h-2 rounded-full bg-[#10B981]/60" />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `${tab.accent}80` }} />
                    <span className="ml-2 text-[11px] text-[#94A3B8]">{tab.label} — preview</span>
                  </div>
                  <div className="p-5 flex items-center gap-4">
                    <span
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${tab.accent}18`, color: tab.accent }}
                    >
                      <Icon className="w-7 h-7" />
                    </span>
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 rounded-full bg-[#E2E8F0] w-3/4" />
                      <div className="h-2.5 rounded-full bg-[#E2E8F0] w-1/2" />
                      <div className="h-2.5 rounded-full bg-[#E2E8F0] w-2/3" />
                    </div>
                  </div>
                </div>

                <a href="#features" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: tab.accent }}>
                  Learn more <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
