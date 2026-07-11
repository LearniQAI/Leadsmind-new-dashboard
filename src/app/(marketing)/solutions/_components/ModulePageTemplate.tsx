'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getModule } from '@/data/modules';
import '../../landing/landing.css';
import Navbar from '../../landing/Navbar';
import Footer from '../../landing/Footer';
import { HeroVisual, heroVisuals } from './visuals';
import FinalCTA from '../../landing/FinalCTA';

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

const sectionHeaderContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const sectionHeaderItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const cardGridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const connectiveFade = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

/** Fixed brand palette — every module page shares these, regardless of that
 *  module's own dropdown-tile accent, so the 9 pages read as one product. */
const ROYAL = '#1359FF';
const ORANGE = '#FF8A00';

export default function ModulePageTemplate({ slug, user }: { slug: string; user?: any }) {
  const mod = getModule(slug);
  if (!mod) return null;
  const Icon = mod.icon;

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar user={user} />

      {/* HERO */}
      <section
        className="relative overflow-hidden pt-[140px] pb-24 md:pt-[168px] md:pb-32"
        style={{ background: `linear-gradient(180deg, #FFFFFF 0%, ${ROYAL}12 100%)` }}
      >
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
                style={{ backgroundColor: ROYAL }}
              >
                <Icon className="w-4.5 h-4.5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ROYAL }}>
                {mod.hero.eyebrow}
              </span>
            </motion.div>
            <motion.h1
              variants={heroTextItem}
              className="text-[clamp(34px,5vw,56px)] font-extrabold !text-[#0F172A] leading-[1.08] tracking-tight mb-6"
            >
              {mod.hero.headline}
            </motion.h1>
            <motion.p variants={heroTextItem} className="text-lg !text-[#64748B] leading-relaxed max-w-xl mb-7">
              {mod.hero.paragraph}
            </motion.p>
            <motion.div variants={heroTextItem} className="flex flex-wrap items-center gap-2 mb-8">
              {mod.hero.capabilityTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{ backgroundColor: `${ROYAL}0C`, color: ROYAL, borderColor: `${ROYAL}22` }}
                >
                  {tag}
                </span>
              ))}
            </motion.div>
            <motion.div variants={heroTextItem} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link href="/auth/signup-basic">
                <Button
                  className="lm-shimmer h-14 px-8 text-base text-white rounded-[14px] font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5 group"
                  style={{ backgroundColor: ORANGE, boxShadow: `0 12px 32px -8px ${ORANGE}66` }}
                >
                  {mod.hero.ctaLabel}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link
                href="/#demo"
                className="h-14 px-8 rounded-[14px] border border-[#0F172A]/15 text-[#0F172A] inline-flex items-center justify-center gap-2.5 font-semibold hover:bg-[#0F172A]/5 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" /> See it in action
              </Link>
            </motion.div>
            <motion.p variants={heroTextItem} className="text-[13px] !text-[#94A3B8] mt-4">
              {mod.hero.finePrint}
            </motion.p>
          </div>

          <motion.div variants={heroVisualItem}>
            <HeroVisual color={ROYAL}>{heroVisuals[mod.hero.visualKey]}</HeroVisual>
          </motion.div>
        </motion.div>
      </section>

      {/* PAIN BAND */}
      <section className="py-20 md:py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            variants={sectionHeaderContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="max-w-2xl mx-auto text-center mb-14"
          >
            <motion.div
              variants={sectionHeaderItem}
              className="text-xs font-bold uppercase tracking-[0.2em] mb-4"
              style={{ color: ROYAL }}
            >
              {mod.pain.eyebrow}
            </motion.div>
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight">
              {mod.pain.headline}
            </motion.h2>
          </motion.div>

          <motion.div
            variants={cardGridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto"
          >
            {mod.pain.points.map((p) => (
              <motion.div
                key={p.kicker}
                variants={cardItem}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-6"
              >
                <div className="font-bold text-[15px] !text-[#0F172A] mb-2">{p.kicker}</div>
                <p className="text-sm !text-[#64748B] leading-relaxed">{p.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* WHAT'S INSIDE */}
      <section className="py-20 md:py-24 bg-[#FAFBFF]">
        <div className="container mx-auto px-6">
          <motion.div
            variants={sectionHeaderContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="max-w-2xl mx-auto text-center mb-14"
          >
            <motion.div
              variants={sectionHeaderItem}
              className="text-xs font-bold uppercase tracking-[0.2em] mb-4"
              style={{ color: ROYAL }}
            >
              {mod.featureGroups.eyebrow}
            </motion.div>
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight">
              {mod.featureGroups.headline}
            </motion.h2>
          </motion.div>

          <motion.div
            variants={cardGridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto"
          >
            {mod.featureGroups.groups.map((g) => (
              <motion.div key={g.title} variants={cardItem} className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                <h3 className="text-[15px] font-bold !text-[#0F172A] mb-3.5">{g.title}</h3>
                <ul className="space-y-2.5">
                  {g.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm !text-[#64748B] leading-relaxed">
                      <Check className="w-3.5 h-3.5 mt-[3px] shrink-0" style={{ color: ROYAL }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ONE DATA LAYER */}
      <section className="py-20 bg-[#F8FAFC] border-t border-[#E2E8F0] text-center">
        <div className="container mx-auto px-6 max-w-2xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={connectiveFade}
          >
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ROYAL }}>
              {mod.connective.eyebrow}
            </div>
            <h2 className="text-[clamp(24px,3.4vw,32px)] font-extrabold !text-[#0F172A] leading-tight mb-4">
              {mod.connective.headline}
            </h2>
            <p className="!text-[#64748B] text-[15px] leading-relaxed">{mod.connective.paragraph}</p>
          </motion.div>
        </div>
      </section>

      <FinalCTA
        headline={mod.finalCta.headline}
        subtext={mod.finalCta.subtext}
        primaryLabel={mod.hero.ctaLabel}
        secondaryHref="/#demo"
        finePrint={mod.hero.finePrint}
      />

      <Footer />
    </div>
  );
}
