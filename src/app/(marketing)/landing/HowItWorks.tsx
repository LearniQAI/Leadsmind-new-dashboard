'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { steps } from './data';

export default function HowItWorks() {
  return (
    <section className="py-28 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-20"
        >
          <div className="text-[#4F46E5] font-bold uppercase tracking-[0.25em] text-xs mb-4">How It Works</div>
          <h2 className="text-3xl md:text-5xl font-bold !text-[#0F172A] leading-tight">
            Up and running in minutes
          </h2>
        </motion.div>

        <div className="relative max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
          <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-0 border-t-2 border-dashed border-[#E2E8F0]" />

          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative text-center flex flex-col items-center"
              >
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center mb-6 shadow-lg shadow-[#4F46E5]/25">
                  <Icon className="w-7 h-7" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold !text-[#0F172A] mb-3">{s.title}</h3>
                <p className="!text-[#64748B] text-sm leading-relaxed max-w-xs">{s.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
