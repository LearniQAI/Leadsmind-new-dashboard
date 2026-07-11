'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getModule } from '@/data/modules';
import '../../landing/landing.css';
import Navbar from '../../landing/Navbar';
import Footer from '../../landing/Footer';
import { HeroVisual, MockPanelShell, heroVisuals, sectionVisuals } from './visuals';

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const heroTextItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};
const heroVisualItem = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
};

const blockContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.05 } },
};
const textPop = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};
const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const listItem = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};
/** The mock panel "lands" just after the text column, then its own internal rows
 *  (which only carry `variants`, no own initial/animate) stagger in behind it. */
const visualPop = {
  hidden: { opacity: 0, scale: 0.94, y: 40 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as const,
      staggerChildren: 0.09,
      delayChildren: 0.25,
    },
  },
};

const stripContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
/** Each stat orchestrates its own icon-pop-then-text-fade via nested variants. */
const stripItem = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const stripIconPop = {
  hidden: { opacity: 0, scale: 0.4, rotate: -15 },
  show: { opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 15 } },
};
const stripTextFade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const problemFade = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};
const solutionLabelPop = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'backOut' as const, delay: 0.2 } },
};
const solutionFade = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const, delay: 0.3 } },
};

export default function ModulePageTemplate({ slug, user }: { slug: string; user?: any }) {
  const mod = getModule(slug);
  if (!mod) return null;
  const Icon = mod.icon;

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar user={user} />

      {/* HERO */}
      <section className="relative overflow-hidden pt-[140px] pb-24 md:pt-[168px] md:pb-32 bg-[#FAFBFF]">
        <div className="absolute inset-0 lm-dot-grid-light opacity-60 pointer-events-none" />
        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="show"
          className="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          <div>
            <motion.div variants={heroTextItem} className="inline-flex items-center gap-2.5 mb-6">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: mod.color }}
              >
                <Icon className="w-4.5 h-4.5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: mod.color }}>
                {mod.hero.eyebrow}
              </span>
            </motion.div>
            <motion.h1
              variants={heroTextItem}
              className="text-[clamp(34px,5vw,56px)] font-extrabold !text-[#0F172A] leading-[1.08] tracking-tight mb-6"
            >
              {mod.hero.headline}
            </motion.h1>
            <motion.p variants={heroTextItem} className="text-lg !text-[#64748B] leading-relaxed max-w-xl mb-8">
              {mod.hero.paragraph}
            </motion.p>
            <motion.div variants={heroTextItem}>
              <Link href="/auth/signup-basic">
                <Button
                  className="lm-shimmer h-14 px-8 text-base text-white rounded-[14px] font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5 group"
                  style={{ backgroundColor: mod.color, boxShadow: `0 12px 32px -8px ${mod.color}66` }}
                >
                  {mod.hero.ctaLabel}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
            <motion.p variants={heroTextItem} className="text-[13px] !text-[#94A3B8] mt-4">
              {mod.hero.finePrint}
            </motion.p>
          </div>

          <motion.div variants={heroVisualItem}>
            <HeroVisual color={mod.color}>{heroVisuals[mod.hero.visualKey]}</HeroVisual>
          </motion.div>
        </motion.div>
      </section>

      {/* PROBLEM -> SOLUTION INTRO */}
      <section className="py-20 md:py-24 bg-white">
        <div className="container mx-auto px-6">
          <div
            className="max-w-5xl mx-auto rounded-[20px] border border-[#E2E8F0] p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14"
            style={{ backgroundColor: `${mod.color}08` }}
          >
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={problemFade}
            >
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#94A3B8] mb-4">The problem</div>
              <p className="text-xl md:text-2xl font-semibold !text-[#0F172A] leading-snug">{mod.problemStatement}</p>
            </motion.div>
            <div>
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={solutionLabelPop}
                className="text-xs font-bold uppercase tracking-[0.2em] mb-4 w-fit"
                style={{ color: mod.color }}
              >
                The LeadsMind way
              </motion.div>
              <motion.p
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={solutionFade}
                className="text-base !text-[#64748B] leading-relaxed"
              >
                {mod.solutionStatement}
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ALTERNATING FEATURE SECTIONS */}
      <div className="py-8 bg-white">
        <div className="container mx-auto px-6 space-y-24 md:space-y-28 py-20">
          {mod.sections.map((s) => {
            const reverse = s.imageSide === 'left';
            return (
              <motion.div
                key={s.headline}
                variants={blockContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                className={`flex flex-col ${
                  reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'
                } items-center gap-12 max-w-6xl mx-auto`}
              >
                <div className="flex-1">
                  <motion.div
                    variants={textPop}
                    className="font-bold uppercase tracking-[0.2em] text-xs mb-3"
                    style={{ color: mod.color }}
                  >
                    {s.eyebrow}
                  </motion.div>
                  <motion.h3 variants={textPop} className="text-2xl md:text-3xl font-bold !text-[#0F172A] mb-4 leading-tight">
                    {s.headline}
                  </motion.h3>
                  <motion.p variants={textPop} className="!text-[#64748B] leading-relaxed mb-6">
                    {s.paragraph}
                  </motion.p>
                  <motion.ul variants={listContainer} className="space-y-3">
                    {s.bullets.map((b) => (
                      <motion.li
                        key={b}
                        variants={listItem}
                        className="flex items-center gap-3 text-sm text-[#334155] font-medium"
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${mod.color}18`, color: mod.color }}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        </span>
                        {b}
                      </motion.li>
                    ))}
                  </motion.ul>
                </div>

                <motion.div
                  variants={visualPop}
                  whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                  className="flex-1 w-full"
                >
                  <MockPanelShell accent={mod.color}>{sectionVisuals[s.visualKey]}</MockPanelShell>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CLOSING FEATURE STRIP */}
      <section className="py-16 bg-[#FAFBFF] border-y border-[#F1F5F9]">
        <motion.div
          variants={stripContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] max-w-4xl"
        >
          {mod.closingStats.map((stat) => {
            const StatIcon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                variants={stripItem}
                className="flex items-center gap-3 px-8 first:pl-0 last:pr-0 py-2 sm:py-0"
              >
                <motion.span
                  variants={stripIconPop}
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${mod.color}14` }}
                >
                  <StatIcon className="w-4 h-4" style={{ color: mod.color }} />
                </motion.span>
                <motion.span variants={stripTextFade} className="text-sm font-semibold text-[#334155]">
                  {stat.label}
                </motion.span>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* FINAL CTA */}
      <section
        className="relative overflow-hidden py-24 px-6 text-center"
        style={{ background: 'linear-gradient(160deg, #0A0F3D 0%, #1a1060 45%, #0A0F3D 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="container mx-auto relative z-10"
        >
          <h2
            className="font-black !text-white leading-[1.1] tracking-tight mx-auto max-w-2xl"
            style={{ fontSize: 'clamp(28px, 4.5vw, 48px)' }}
          >
            Ready to get started with {mod.label}?
          </h2>
          <p className="!text-white/70 text-lg mx-auto max-w-xl mt-4 mb-10">
            Join 500+ African businesses already running on LeadsMind.
          </p>
          <Link href="/auth/signup-basic">
            <Button
              className="lm-shimmer h-14 px-8 text-base bg-white hover:bg-white hover:-translate-y-0.5 rounded-[14px] font-bold shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] transition-all duration-200 group"
              style={{ color: mod.color }}
            >
              {mod.hero.ctaLabel}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="!text-white/50 text-[13px] mt-5">{mod.hero.finePrint}</p>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
