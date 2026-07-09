'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { steps } from './data';
import { SectionReveal } from './motion';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.35 } },
};

const stepContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const iconPop = {
  hidden: { scale: 0.4, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'backOut' },
  },
};

const textReveal = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut', delay: 0.15 },
  },
};

const lineDraw = {
  hidden: { scaleX: 0 },
  show: {
    scaleX: 1,
    transition: { duration: 0.6, ease: 'easeInOut', delay: 0.2 },
  },
};

export default function HowItWorks() {
  return (
    <section className="py-28 bg-white">
      <div className="container mx-auto px-6">
        <SectionReveal>
        <div className="max-w-2xl mx-auto text-center mb-20">
          <div className="text-[#4F46E5] font-bold uppercase tracking-[0.25em] text-xs mb-4">How It Works</div>
          <h2 className="text-3xl md:text-5xl font-bold !text-[#0F172A] leading-tight">
            Up and running in minutes
          </h2>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="relative max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6"
        >
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <React.Fragment key={s.title}>
                <motion.div variants={stepContainer} className="relative text-center flex flex-col items-center">
                  <motion.div
                    variants={iconPop}
                    className="relative z-10 w-16 h-16 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center mb-6 shadow-lg shadow-[#4F46E5]/25"
                  >
                    <Icon className="w-7 h-7" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </motion.div>
                  <motion.div variants={textReveal}>
                    <h3 className="text-lg font-bold !text-[#0F172A] mb-3">{s.title}</h3>
                    <p className="!text-[#64748B] text-sm leading-relaxed max-w-xs">{s.description}</p>
                  </motion.div>
                </motion.div>
                {i < steps.length - 1 && (
                  <motion.div
                    variants={lineDraw}
                    style={{ transformOrigin: 'left center' }}
                    className={`hidden md:block absolute top-8 h-0 border-t-2 border-dashed border-[#E2E8F0] ${
                      i === 0 ? 'left-[16.5%] right-[50%]' : 'left-[50%] right-[16.5%]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </motion.div>
        </SectionReveal>
      </div>
    </section>
  );
}
