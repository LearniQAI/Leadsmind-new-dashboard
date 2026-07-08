'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { testimonials } from './data';

export default function Testimonials() {
  return (
    <section className="py-28 bg-[#F8FAFC]">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <div className="text-[#4F46E5] font-bold uppercase tracking-[0.25em] text-xs mb-4">What Clients Say</div>
          <h2 className="text-3xl md:text-5xl font-bold !text-[#0F172A] leading-tight">
           African businesses love LeadsMind
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -6 }}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm transition-shadow hover:shadow-xl"
            >
              <Quote className="w-8 h-8 text-[#4F46E5]/30 mb-4" fill="currentColor" />
              <p className="!text-[#334155] leading-relaxed mb-6 text-sm">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-[#EEF2FF] text-[#4F46E5] font-bold text-sm flex items-center justify-center">
                  {t.initials}
                </span>
                <div>
                  <div className="text-sm font-bold text-[#0F172A]">{t.name}</div>
                  <div className="text-xs text-[#64748B]">{t.title}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
