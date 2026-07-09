'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { deepFeatures } from './data';

const blockContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.05 } },
};

const iconPop = {
  hidden: { scale: 0.4, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'backOut' as const },
  },
};

const textPop = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const listItem = {
  hidden: { opacity: 0, x: -16 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

const visualPop = {
  hidden: { opacity: 0, scale: 0.9, y: 40 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function CrmVisual() {
  const cols = [
    { title: 'New', color: '#4F46E5', items: ['Mokoena Foods', 'Baobab Studio'] },
    { title: 'Proposal', color: '#F59E0B', items: ['Ubuntu Fitness'] },
    { title: 'Won', color: '#10B981', items: ['Karoo Freight', 'Amanzi Spa'] },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cols.map((c) => (
        <div key={c.title} className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">{c.title}</span>
          </div>
          <div className="space-y-2">
            {c.items.map((it) => (
              <div key={it} className="rounded-lg bg-white border border-[#E2E8F0] px-2.5 py-2 text-[11px] font-medium text-[#334155] shadow-sm">
                {it}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LmsVisual() {
  const courses = [
    { name: 'Digital Marketing 101', students: 128, progress: 82 },
    { name: 'Bookkeeping Basics', students: 64, progress: 55 },
    { name: 'Sales Mastery', students: 201, progress: 94 },
  ];
  return (
    <div className="space-y-3">
      {courses.map((c) => (
        <div key={c.name} className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#0F172A] mb-1">{c.name}</div>
            <div className="text-[11px] text-[#64748B] mb-2">{c.students} students enrolled</div>
            <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
              <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${c.progress}%` }} />
            </div>
          </div>
          <span className="text-sm font-bold text-[#7C3AED] tabular-nums">{c.progress}%</span>
        </div>
      ))}
    </div>
  );
}

function InvoiceVisual() {
  return (
    <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-[#0F172A]">Invoice #1048</div>
          <div className="text-[11px] text-[#64748B]">Due 15 Aug 2026</div>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-full">
          Paid
        </span>
      </div>
      <div className="space-y-2 mb-4">
        {[
          ['Website design retainer', 'R 8,500.00'],
          ['Monthly hosting', 'R 450.00'],
        ].map(([label, amount]) => (
          <div key={label} className="flex items-center justify-between text-xs text-[#334155] border-b border-[#E2E8F0] pb-2">
            <span>{label}</span>
            <span className="font-semibold tabular-nums">{amount}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-[#0F172A]">Total</span>
        <span className="text-lg font-bold text-[#0891B2] tabular-nums">R 8,950.00</span>
      </div>
      <div className="flex gap-2">
        <span className="flex-1 text-center text-[11px] font-semibold rounded-lg bg-[#0891B2]/10 text-[#0891B2] py-2">PayFast</span>
        <span className="flex-1 text-center text-[11px] font-semibold rounded-lg bg-[#4F46E5]/10 text-[#4F46E5] py-2">Stripe</span>
      </div>
    </div>
  );
}

const visuals: Record<string, React.ReactNode> = {
  crm: <CrmVisual />,
  lms: <LmsVisual />,
  accounting: <InvoiceVisual />,
};

export default function FeaturesDeepDive() {
  return (
    <section id="features" className="py-8 bg-white">
      <div className="container mx-auto px-6 space-y-28 py-20">
        {deepFeatures.map((f) => {
          const Icon = f.icon;
          const reverse = f.side === 'left';
          return (
            <motion.div
              key={f.key}
              variants={blockContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 max-w-6xl mx-auto`}
            >
              <div className="flex-1">
                <motion.div variants={iconPop} className="w-12 h-12 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mb-6">
                  <Icon className="w-6 h-6" />
                </motion.div>
                <motion.div variants={textPop} className="text-[#4F46E5] font-bold uppercase tracking-[0.2em] text-xs mb-3">{f.tag}</motion.div>
                <motion.h3 variants={textPop} className="text-2xl md:text-3xl font-bold !text-[#0F172A] mb-4 leading-tight">{f.headline}</motion.h3>
                <motion.p variants={textPop} className="!text-[#64748B] leading-relaxed mb-6">{f.body}</motion.p>
                <motion.ul variants={listContainer} className="space-y-3">
                  {f.features.map((feat) => {
                    const FIcon = feat.icon;
                    return (
                      <motion.li key={feat.text} variants={listItem} className="flex items-center gap-3 text-sm text-[#334155] font-medium">
                        <span className="w-6 h-6 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center shrink-0">
                          <FIcon className="w-3.5 h-3.5" />
                        </span>
                        {feat.text}
                      </motion.li>
                    );
                  })}
                </motion.ul>
              </div>

              <motion.div
                variants={visualPop}
                whileHover={{ y: -4 }}
                className="flex-1 w-full rounded-2xl border border-[#E2E8F0] bg-white shadow-xl shadow-[#0F172A]/5 p-2"
              >
                <div className="rounded-xl border border-[#E2E8F0] p-5">{visuals[f.key]}</div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
