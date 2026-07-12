'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import '../../landing/landing.css';
import Navbar from '../../landing/Navbar';
import Footer from '../../landing/Footer';
import { modules } from '@/data/modules';

const cardContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export default function SolutionsIndexContent({ user }: { user?: any }) {
  const primaryModules = modules.filter((m) => m.primary);
  const alsoIncluded = modules.filter((m) => !m.primary);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar user={user} />

      <section className="relative overflow-hidden pt-[140px] pb-16 md:pt-[168px] md:pb-20 bg-[#FAFBFF]">
        <div className="absolute inset-0 lm-dot-grid-light opacity-60 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="container mx-auto px-6 relative z-10 max-w-2xl text-center"
        >
          <div className="text-[#1359FF] font-bold uppercase tracking-[0.25em] text-xs mb-4">Everything, one login</div>
          <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold !text-[#0F172A] leading-[1.1] tracking-tight mb-5">
            Every part of LeadsMind. Click into what matters to you.
          </h1>
          <p className="text-lg !text-[#64748B] leading-relaxed">
            Nine connected modules, one login, priced in Rands. Explore what each one does, or start a free trial
            and turn them all on at once.
          </p>
        </motion.div>
      </section>

      <section className="py-20 bg-white">
        <motion.div
          variants={cardContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="container mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl"
        >
          {primaryModules.map((m) => {
            const Icon = m.icon;
            return (
              <motion.div key={m.slug} variants={cardItem}>
                <Link
                  href={`/solutions/${m.slug}`}
                  className="group flex flex-col h-full rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_44px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-300"
                >
                  <span
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-5 transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: m.color }}
                  >
                    <Icon className="w-5.5 h-5.5" />
                  </span>
                  <h3 className="text-lg font-bold !text-[#0F172A] mb-2.5">{m.label}</h3>
                  <p className="text-sm !text-[#64748B] leading-relaxed mb-6 flex-1">{m.cardDescription}</p>
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: m.color }}
                  >
                    Learn more
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {alsoIncluded.length > 0 && (
        <section className="py-20" 
        style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1a1060 40%, #0F172A 100%)' }}
>
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="max-w-xl mx-auto text-center mb-12"
            >
              <div className="text-[#00B2FF] font-bold uppercase tracking-[0.2em] text-xs mb-4">Also included</div>
              <h2 className="text-[clamp(24px,3.4vw,32px)] font-extrabold !text-white leading-tight mb-3">
                More of what's on the platform
              </h2>
              <p className="!text-white/60 text-[15px] leading-relaxed">
                Already built and live — just tucked a level deeper than the core nine.
              </p>
            </motion.div>

            <motion.div
              variants={cardContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto"
            >
              {alsoIncluded.map((m) => {
                const Icon = m.icon;
                return (
                  <motion.div key={m.slug} variants={cardItem}>
                    <Link
                      href={`/solutions/${m.slug}`}
                      className="group flex flex-col h-full rounded-2xl bg-white/[0.06] border border-white/10 p-5 hover:bg-white/[0.1] hover:border-white/20 transition-colors duration-200"
                    >
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white mb-4 shrink-0"
                        style={{ backgroundColor: m.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <h4 className="text-[14.5px] font-bold !text-white mb-1.5">{m.label}</h4>
                      <p className="text-[12.5px] !text-white/60 leading-relaxed">{m.shortDescription}</p>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
