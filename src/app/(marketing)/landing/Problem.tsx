'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Unlink2, Globe, type LucideIcon } from 'lucide-react';
import { useCountUp } from './hooks';

const cardContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

type ProblemCard = {
  title: string;
  color: string;
  icon: LucideIcon;
  stat: number;
  suffix: string;
  statLabel: string;
  body: string;
};

const cards: ProblemCard[] = [
  {
    title: 'Too Many Subscriptions',
    color: '#1a1060',
    icon: CreditCard,
    stat: 6,
    suffix: '+',
    statLabel: 'separate tools the average SME pays for',
    body: 'CRM here, accounting there, HR somewhere else. The costs add up and nothing talks to each other.',
  },
  {
    title: 'Data Lives in Silos',
    color: '#00A2FA',
    icon: Unlink2,
    stat: 47,
    suffix: '%',
    statLabel: 'of leads are lost due to poor follow-up',
    body: "Your leads don't know about your invoices. Your LMS doesn't know about your contacts. Every tool is an island.",
  },
  {
    title: 'Built for Overseas Markets',
    color: '#8B5CF6',
    icon: Globe,
    stat: 0,
    suffix: '',
    statLabel: 'major SaaS platforms built for Africa',
    body: 'Most tools show USD, use MM/DD/YYYY, and have no understanding of African business. Until now.',
  },
];

function StatNumber({ target, suffix, color }: { target: number; suffix: string; color: string }) {
  const { ref, value } = useCountUp(target);

  if (target === 0) {
    return (
      <div className="text-[40px] sm:text-[52px] font-black leading-none" style={{ color }}>
        0
      </div>
    );
  }

  return (
    <div ref={ref} className="text-[40px] sm:text-[52px] font-black leading-none tabular-nums" style={{ color }}>
      {value}
      {suffix}
    </div>
  );
}

function ProblemCard({ card }: { card: ProblemCard }) {
  const Icon = card.icon;
  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -4 }}
      className="bg-white border border-[#E2E8F0] border-t-4 rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.1)] transition-shadow duration-300"
      style={{ borderTopColor: card.color }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-6"
        style={{ backgroundColor: `${card.color}1A`, color: card.color }}
      >
        <Icon className="w-5 h-5" />
      </div>

      <h3 className="text-lg font-bold !text-[#0F172A] mb-4">{card.title}</h3>

      <StatNumber target={card.stat} suffix={card.suffix} color={card.color} />
      <p className="text-sm font-medium !text-[#64748B] mt-2 mb-4">{card.statLabel}</p>

      <p className="text-sm !text-[#64748B] leading-relaxed">{card.body}</p>
    </motion.div>
  );
}

export default function Problem() {
  return (
    <section className="problem-section py-24 bg-[#FAFBFF] relative overflow-hidden">
      <div className="absolute inset-0 lm-dot-grid-light opacity-60 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-[700px] mx-auto mb-14"
        >
          <span className="inline-block text-[#EF4444] bg-[#FEF2F2] font-bold uppercase tracking-[0.1em] text-xs px-4 py-1.5 rounded-full mb-5">
            The Problem
          </span>
          <h2 className="text-[clamp(28px,4vw,48px)] font-extrabold !text-[#0F172A] leading-tight max-w-[700px] mx-auto">
             African businesses are drowning in disconnected tools
          </h2>
          <p className="text-base !text-[#64748B] max-w-[560px] mx-auto mt-5">
            Most African SMEs juggle 6+ disconnected tools. The result: missed leads,
            lost revenue, and exhausted teams.
          </p>
        </motion.div>

        <motion.div
          variants={cardContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1100px] mx-auto text-left"
        >
          {cards.map((card) => (
            <ProblemCard key={card.title} card={card} />
          ))}
        </motion.div>

        <div className="text-center mt-12">
          <p className="!text-[#64748B] text-[15px] italic mb-4">"There has to be a better way."</p>
          <div
            className="w-[2px] h-12 mx-auto"
            style={{ background: 'linear-gradient(#4F46E5, transparent)' }}
          />
        </div>
      </div>
    </section>
  );
}
