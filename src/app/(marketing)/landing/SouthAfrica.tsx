'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { saCards } from './data';
import { SectionReveal } from './motion';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const item = {
  hidden: { opacity: 0, y: 35 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function SouthAfrica() {
  return (
    <section className="py-28 bg-[#F8FAFC]">
      <div className="container mx-auto px-6">
        <SectionReveal>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <div className="text-[#4F46E5] font-bold uppercase tracking-[0.25em] text-xs mb-4 flex items-center justify-center gap-2">
            🇿🇦 Built for Africa
          </div>
          <h2 className="text-3xl md:text-5xl font-bold !text-[#0F172A] leading-tight">
            Finally, a platform that understands African business
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto"
        >
          {saCards.map((c) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                variants={item}
                whileHover={{ y: -8, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-7 relative overflow-hidden transition-shadow hover:shadow-xl hover:shadow-[#4F46E5]/10"
              >
                <span className="absolute top-5 right-5 text-lg">🇿🇦</span>
                <motion.div
                  whileHover={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.4 }}
                  className="w-11 h-11 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mb-5"
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <h3 className="text-base font-bold !text-[#0F172A] mb-2">{c.title}</h3>
                <p className="!text-[#64748B] text-sm leading-relaxed">{c.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
        </SectionReveal>
      </div>
    </section>
  );
}
