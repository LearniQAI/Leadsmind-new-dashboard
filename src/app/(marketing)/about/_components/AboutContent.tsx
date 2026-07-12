'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Quote,
  Globe,
  Wallet,
  Layers,
  Users,
  BookOpen,
  Building2,
  Check,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import '../../landing/landing.css';
import Navbar from '../../landing/Navbar';
import Footer from '../../landing/Footer';
import FinalCTA from '../../landing/FinalCTA';

const ROYAL = '#1359FF';
const ORANGE = '#FF8A00';
const DARK_GRADIENT = 'linear-gradient(160deg, #0F172A 0%, #1a1060 40%, #0F172A 100%)';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};
const sectionHeaderContainer = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const sectionHeaderItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};
const cardGridContainer = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };
const cardItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const capabilities = [
  'CRM', 'Accounting', 'LMS Courses', 'Email Marketing', 'Automation', 'WhatsApp', 'Invoicing',
  'AI Tools', 'Funnels', 'Website Builder', 'Local Tax Compliance', 'Bank Feeds', 'Data in Africa',
  'Local Currency Billing',
];

function CapabilityTicker() {
  const loop = [...capabilities, ...capabilities];
  return (
    <div className="w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <motion.div
        className="flex gap-3 w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 32, ease: 'linear', repeat: Infinity }}
      >
        {loop.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="shrink-0 text-sm font-semibold px-4 py-2 rounded-full border whitespace-nowrap"
            style={{ backgroundColor: `${ROYAL}0C`, color: ROYAL, borderColor: `${ROYAL}22` }}
          >
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

const originPillars = [
  {
    title: 'The tools were built for someone else',
    body: 'African business owners were paying for software designed in Silicon Valley, priced in dollars, and built for American tax systems, American banks, and American customer behaviour. None of it understood how business works on this continent.',
  },
  {
    title: 'Every tool spoke a different language',
    body: 'One tool for CRM. Another for email. Another for accounting. Another for invoicing. Another for courses. Seven logins, seven subscriptions in foreign currencies, and zero data that talks to each other. Every African entrepreneur we spoke to described the same exhaustion.',
  },
  {
    title: "So we built what didn't exist",
    body: 'LeadsMind was created to be the first true African Business Operating System — one login, one platform, one subscription in your local currency, replacing everything a growing African business needs to run and scale.',
  },
];

const platformFacts = [
  { label: 'Platform name', value: 'LeadsMind' },
  { label: 'Markets served', value: 'Pan-African · 54 countries' },
  { label: 'Billing currency', value: 'Your local currency' },
  { label: 'Data residency', value: 'Hosted in Africa' },
  { label: 'Languages', value: 'English + 10 African languages' },
  { label: 'Status', value: 'Live and growing' },
];

const beliefs = [
  {
    icon: Globe,
    title: 'Africa deserves software built for Africa',
    body: 'African businesses manage local tax authorities, WhatsApp client relationships, local currency invoicing, and connectivity challenges — none of which foreign software was designed to handle. We build for the African context first, not as an afterthought or a localisation patch applied later.',
  },
  {
    icon: Wallet,
    title: 'Foreign currency pricing punishes African growth',
    body: 'When your local currency weakens against the dollar or euro, foreign software silently charges your business more every single month — without changing your plan, without adding features. LeadsMind prices in your currency. Fixed. Predictable. Always.',
  },
  {
    icon: Layers,
    title: 'Disconnected tools are the real enemy of growth',
    body: 'Every hour an African business owner spends switching between five different apps is an hour they are not selling, delivering, or building. One fully connected platform saves more than money — it gives back the mental energy that growth actually requires.',
  },
];

const toolStack = [
  'Accounting software',
  'Email marketing platform',
  'CRM / sales software',
  'Appointment booking tool',
  'Content and writing tools',
  'Social media scheduler',
  'Online course platform',
];

const painPoints = [
  'Paying for 6–10 disconnected tools that were never designed to work together — and watching that cost grow every time the exchange rate moves',
  'USD-priced software that costs 20–40% more every year as local currencies fluctuate — without any new features being added',
  'Tax authority deadlines, compliance anxiety, and audit risk from informal bookkeeping in spreadsheets',
  'Client conversations scattered across WhatsApp, email, Instagram, and Facebook — with no central record and no follow-up system',
  'Hours lost re-entering the same data into different apps, and producing reports that never fully agree with each other',
];

const givesBack = [
  '3–8 hours recovered every week from admin, manual follow-ups, and app-switching',
  "Local tax compliance — VAT, income tax, payroll — handled inside the platform, in your country's format",
  'One inbox for WhatsApp, email, SMS, Facebook Messenger, and Instagram — all in one thread per client',
  'Overdue invoices chased automatically through a multi-step reminder sequence — no awkward phone calls',
  'Leads followed up automatically, courses delivered automatically, reviews requested automatically — while you focus on your actual work',
];

const whoWeServe = [
  {
    icon: Users,
    title: 'African business owners and SMEs',
    body: 'You run a business with 1–50 people. You are drowning in disconnected apps, paying foreign prices for tools that were never built for your market, and spending too much time on admin instead of growth. LeadsMind replaces your entire software stack — CRM, accounting, invoicing, marketing, and automation — billed in your local currency from day one.',
    tag: 'All business sizes · Local currency billing',
  },
  {
    icon: BookOpen,
    title: 'Course creators, trainers, and educators',
    body: 'You are paying thousands every month in foreign currency for a course platform that does not handle your CRM, your invoicing, or your local tax requirements. LeadsMind gives you a full LMS — certificates, drip content, student analytics, cohort management — combined with CRM, email marketing, payment plans, and AI writing tools, all in one platform billed locally.',
    tag: 'LMS + CRM + Marketing · All-in-one',
  },
  {
    icon: Building2,
    title: 'Digital agencies and service providers',
    body: "You manage multiple client accounts and are paying dollar rates for agency platforms that were built for American businesses. LeadsMind gives your agency unlimited client sub-accounts, full compliance-ready accounting, a support ticket system, and a SaaS reseller model — letting you build a recurring revenue stream on top of LeadsMind's infrastructure at a fraction of the dollar-priced alternatives.",
    tag: 'White-label · Reseller model · Multi-client',
  },
];

const whyWeWin = [
  {
    num: '01',
    title: 'Local tax compliance inside a CRM',
    body: 'Building tax compliance for each African country — VAT, income tax, payroll — requires deep local engineering that takes 12–18 months per market. International platforms have no commercial incentive to do this for individual African countries. We do it because Africa is our entire focus.',
  },
  {
    num: '02',
    title: 'Local currency billing and African data residency',
    body: 'Foreign platforms cannot simply flip a billing currency. They need local banking relationships, local payment processing, and a local business entity in each country. That is a 6–18 month process per market with uncertain ROI. LeadsMind is already here, already local, already connected.',
  },
  {
    num: '03',
    title: 'African-language AI — Zulu, Swahili, Yoruba, Hausa, Afrikaans, Amharic and more',
    body: 'Training AI models that perform well in African languages requires specialised datasets and significant investment. International AI tools perform poorly in most African languages. Ours are built for them. This is a genuine technical wall, not a temporary gap.',
  },
  {
    num: '04',
    title: 'WhatsApp-native communication — the channel Africa runs on',
    body: "WhatsApp is the primary business communication channel across the continent. LeadsMind's WhatsApp Business API integration — unified inbox, broadcast campaigns, automated follow-ups, ticket conversion — is a workflow built for how African businesses actually communicate, not adapted from a US product.",
  },
];

const whyWeWinFull = {
  num: '05',
  title: 'Agency white-label and SaaS reseller model — a distribution network that grows itself',
  body: 'The agency plan creates a network of local businesses across Africa with a direct financial incentive to bring their clients onto LeadsMind. Each agency that resells LeadsMind to ten clients generates recurring revenue from our infrastructure — and deepens the switching cost for everyone on the platform. This compounding distribution network is extremely difficult to reverse once it is in motion, and it is already in motion.',
};

const metrics = [
  { value: '30+', label: 'Platform modules built' },
  { value: '54', label: 'African countries we are building for' },
  { value: '10+', label: 'African languages supported' },
  { value: 'Free', label: 'To start — in your local currency' },
];

const statusStyles: Record<string, { bg: string; color: string }> = {
  'Live now': { bg: '#10B9811A', color: '#059669' },
  Expanding: { bg: `${ORANGE}1A`, color: ORANGE },
  'Coming soon': { bg: '#64748B1A', color: '#64748B' },
  'The mission': { bg: `${ROYAL}1A`, color: ROYAL },
};

const markets = [
  { flag: '🇿🇦', name: 'South Africa', detail: 'SARS compliance · ZAR billing · 11 official languages', status: 'Live now' },
  { flag: '🇳🇬', name: 'Nigeria', detail: 'FIRS compliance · NGN billing · Yoruba · Igbo · Hausa', status: 'Expanding' },
  { flag: '🇰🇪', name: 'Kenya', detail: 'KRA compliance · KES billing · Swahili AI', status: 'Expanding' },
  { flag: '🇬🇭', name: 'Ghana', detail: 'GRA compliance · GHS billing · Twi AI', status: 'Coming soon' },
  { flag: '🇪🇬', name: 'Egypt', detail: 'ETA compliance · EGP billing · Arabic AI', status: 'Coming soon' },
  { flag: '🌍', name: 'All of Africa', detail: '54 countries · 1.4 billion people · one platform', status: 'The mission' },
];

function StatBlock({ value, label, dark = false }: { value: string; label: string; dark?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-black tabular-nums" style={{ color: dark ? '#FFFFFF' : '#0F172A' }}>
        {value}
      </div>
      <div className={`mt-1 text-sm font-medium ${dark ? '!text-white/60' : '!text-[#64748B]'}`}>{label}</div>
    </div>
  );
}

export default function AboutContent({ user }: { user?: any }) {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar user={user} />

      {/* HERO */}
      <section
        className="relative overflow-hidden pt-[140px] pb-16 md:pt-[168px] md:pb-20"
        style={{ background: `linear-gradient(180deg, #FFFFFF 0%, ${ROYAL}12 100%)` }}
      >
        <div className="absolute inset-0 lm-dot-grid-light opacity-60 pointer-events-none" />
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="container mx-auto px-6 relative z-10 max-w-3xl text-center"
        >
          <motion.div variants={item} className="text-xs font-bold uppercase tracking-[0.25em] mb-5" style={{ color: ROYAL }}>
            Africa&apos;s Business Operating System
          </motion.div>
          <motion.h1
            variants={item}
            className="text-[clamp(34px,5vw,56px)] font-extrabold !text-[#0F172A] leading-[1.08] tracking-tight mb-6"
          >
            Built for Africa. By Africa.
          </motion.h1>
          <motion.p variants={item} className="text-lg !text-[#64748B] leading-relaxed mb-10 max-w-2xl mx-auto">
            LeadsMind is the continent&apos;s first all-in-one business platform — CRM, accounting, LMS course
            delivery, email marketing, automation, and AI — in one login, billed in your local currency, built for
            the way business works across Africa.
          </motion.p>

          <motion.div variants={item} className="flex items-center justify-center gap-8 sm:gap-14 mb-10">
            <StatBlock value="30+" label="Platform modules" />
            <StatBlock value="Free" label="To get started" />
            <StatBlock value="54" label="Countries. One platform." />
          </motion.div>

          <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup-basic">
              <Button
                className="lm-shimmer h-14 px-8 text-base text-white rounded-[14px] font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5 group"
                style={{ backgroundColor: ORANGE, boxShadow: `0 12px 32px -8px ${ORANGE}66` }}
              >
                Start free — no card needed
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link
              href="#origin"
              className="h-14 px-8 rounded-[14px] border border-[#0F172A]/15 text-[#0F172A] inline-flex items-center justify-center gap-2.5 font-semibold hover:bg-[#0F172A]/5 transition-colors"
            >
              Our story →
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* CAPABILITY TICKER */}
      <section className="py-10 bg-white border-b border-[#E2E8F0]">
        <CapabilityTicker />
      </section>

      {/* ORIGIN STORY */}
      <section id="origin" className="py-20 md:py-24 bg-white scroll-mt-24">
        <div className="container mx-auto px-6">
          <motion.div
            variants={sectionHeaderContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="max-w-2xl mb-14"
          >
            <motion.div variants={sectionHeaderItem} className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ROYAL }}>
              Our origin
            </motion.div>
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight">
              A platform born out of frustration.
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl">
            <motion.div
              variants={cardGridContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="space-y-8"
            >
              {originPillars.map((p, i) => (
                <motion.div key={p.title} variants={cardItem} className="flex gap-5">
                  <span
                    className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: ROYAL }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold !text-[#0F172A] mb-2">{p.title}</h3>
                    <p className="text-sm !text-[#64748B] leading-relaxed">{p.body}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
                <Quote className="w-8 h-8 mb-4" style={{ color: `${ROYAL}4D` }} fill="currentColor" />
                <p className="!text-[#334155] leading-relaxed mb-6 text-[15px]">
                  &ldquo;The question was never whether African businesses needed better software. They clearly did.
                  The question was why nobody had built it yet — properly, in local currency, for local compliance,
                  in local languages, for the way people actually run businesses on this continent.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className="w-11 h-11 rounded-full font-bold text-sm flex items-center justify-center"
                    style={{ backgroundColor: `${ROYAL}14`, color: ROYAL }}
                  >
                    NA
                  </span>
                  <div>
                    <div className="text-sm font-bold text-[#0F172A]">Nelly Agboola</div>
                    <div className="text-xs text-[#64748B]">Founder, LeadsMind</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFF] p-8">
                <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5" style={{ color: ROYAL }}>
                  Platform at a glance
                </h4>
                <dl className="space-y-3">
                  {platformFacts.map((f) => (
                    <div key={f.label} className="flex items-center justify-between gap-4 text-sm">
                      <dt className="!text-[#64748B]">{f.label}</dt>
                      <dd className="font-semibold !text-[#0F172A] text-right">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* WHAT WE BELIEVE */}
      <section className="py-20 md:py-24 bg-[#FAFBFF]">
        <div className="container mx-auto px-6">
          <motion.div
            variants={sectionHeaderContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="max-w-2xl mx-auto text-center mb-14"
          >
            <motion.div variants={sectionHeaderItem} className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ROYAL }}>
              What We Believe
            </motion.div>
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight">
              The principles behind every decision
            </motion.h2>
          </motion.div>

          <motion.div
            variants={cardGridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
          >
            {beliefs.map((b) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.title}
                  variants={cardItem}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_44px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-300"
                >
                  <span
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-5"
                    style={{ backgroundColor: ROYAL }}
                  >
                    <Icon className="w-5.5 h-5.5" />
                  </span>
                  <h3 className="text-lg font-bold !text-[#0F172A] mb-2.5">{b.title}</h3>
                  <p className="text-sm !text-[#64748B] leading-relaxed">{b.body}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* THE PROBLEM WE SOLVE */}
      <section className="py-20 md:py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            variants={sectionHeaderContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="max-w-2xl mb-14"
          >
            <motion.div variants={sectionHeaderItem} className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ROYAL }}>
              The problem we solve
            </motion.div>
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight mb-4">
              What most African businesses pay today
            </motion.h2>
            <motion.p variants={sectionHeaderItem} className="text-base !text-[#64748B] leading-relaxed max-w-2xl">
              Before LeadsMind, the typical African entrepreneur ran their entire business across seven separate
              tools — all billed in foreign currencies, none designed to talk to each other.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm h-fit"
            >
              <div className="space-y-0.5">
                {toolStack.map((tool) => (
                  <div key={tool} className="flex items-center justify-between py-3 border-b border-[#F1F5F9]">
                    <span className="text-sm font-medium !text-[#334155]">{tool}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide !text-[#94A3B8]">USD-priced</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3 border-b border-[#F1F5F9]">
                  <span className="text-sm font-bold !text-[#0F172A]">Total</span>
                  <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#DC2626' }}>
                    Expensive every month
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 mt-1 px-3 rounded-xl" style={{ backgroundColor: `${ROYAL}0C` }}>
                  <span className="text-sm font-bold" style={{ color: ROYAL }}>
                    LeadsMind — all of the above + automation + AI
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: ROYAL }}>
                    One local price
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={cardGridContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="space-y-8"
            >
              <motion.div variants={cardItem}>
                <h3 className="text-sm font-bold uppercase tracking-[0.1em] !text-[#94A3B8] mb-4">Today, without LeadsMind</h3>
                <ul className="space-y-3">
                  {painPoints.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <Minus className="w-4 h-4 mt-1 shrink-0 !text-[#94A3B8]" />
                      <span className="text-sm !text-[#64748B] leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div variants={cardItem}>
                <h3 className="text-sm font-bold uppercase tracking-[0.1em] mb-4" style={{ color: ROYAL }}>
                  What LeadsMind gives back
                </h3>
                <ul className="space-y-3">
                  {givesBack.map((g) => (
                    <li key={g} className="flex items-start gap-3">
                      <Check className="w-4 h-4 mt-1 shrink-0" style={{ color: ROYAL }} />
                      <span className="text-sm font-medium !text-[#334155] leading-relaxed">{g}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* WHO WE SERVE */}
      <section className="py-20 md:py-24 bg-[#FAFBFF]">
        <div className="container mx-auto px-6">
          <motion.div
            variants={sectionHeaderContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="max-w-2xl mx-auto text-center mb-14"
          >
            <motion.div variants={sectionHeaderItem} className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ROYAL }}>
              Who We Serve
            </motion.div>
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight">
              Built for how you actually work
            </motion.h2>
          </motion.div>

          <motion.div
            variants={cardGridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
          >
            {whoWeServe.map((w) => {
              const Icon = w.icon;
              return (
                <motion.div
                  key={w.title}
                  variants={cardItem}
                  className="flex flex-col h-full rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_44px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-300"
                >
                  <span
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-5"
                    style={{ backgroundColor: ROYAL }}
                  >
                    <Icon className="w-5.5 h-5.5" />
                  </span>
                  <h3 className="text-lg font-bold !text-[#0F172A] mb-2.5">{w.title}</h3>
                  <p className="text-sm !text-[#64748B] leading-relaxed mb-6 flex-1">{w.body}</p>
                  <span
                    className="inline-flex w-fit text-xs font-semibold px-3 py-1.5 rounded-full border"
                    style={{ backgroundColor: `${ROYAL}0C`, color: ROYAL, borderColor: `${ROYAL}22` }}
                  >
                    {w.tag}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* WHY WE WIN */}
      <section className="py-20 md:py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            variants={sectionHeaderContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="max-w-2xl mx-auto text-center mb-14"
          >
            <motion.div variants={sectionHeaderItem} className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ROYAL }}>
              Why We Win
            </motion.div>
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight">
              Advantages nobody can copy overnight
            </motion.h2>
          </motion.div>

          <motion.div
            variants={cardGridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto"
          >
            {whyWeWin.map((w) => (
              <motion.div key={w.num} variants={cardItem} className="rounded-2xl border border-[#E2E8F0] bg-white p-7">
                <div className="text-3xl font-black mb-3" style={{ color: `${ROYAL}33` }}>
                  {w.num}
                </div>
                <h3 className="text-base font-bold !text-[#0F172A] mb-2.5 leading-snug">{w.title}</h3>
                <p className="text-sm !text-[#64748B] leading-relaxed">{w.body}</p>
              </motion.div>
            ))}
            <motion.div
              variants={cardItem}
              className="md:col-span-2 rounded-2xl border border-[#E2E8F0] p-8"
              style={{ backgroundColor: `${ROYAL}08` }}
            >
              <div className="text-3xl font-black mb-3" style={{ color: `${ROYAL}55` }}>
                {whyWeWinFull.num}
              </div>
              <h3 className="text-base font-bold !text-[#0F172A] mb-2.5 leading-snug max-w-2xl">{whyWeWinFull.title}</h3>
              <p className="text-sm !text-[#64748B] leading-relaxed max-w-3xl">{whyWeWinFull.body}</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* METRICS BAND */}
      <section className="relative overflow-hidden py-16" style={{ background: DARK_GRADIENT }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <motion.div
          variants={cardGridContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="container mx-auto px-6 relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl"
        >
          {metrics.map((m) => (
            <motion.div key={m.label} variants={cardItem}>
              <StatBlock value={m.value} label={m.label} dark />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* OUR MARKETS */}
      <section className="py-20 md:py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div>
              <motion.div
                variants={sectionHeaderContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                className="mb-10"
              >
                <motion.div variants={sectionHeaderItem} className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ROYAL }}>
                  Our markets
                </motion.div>
                <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight mb-4">
                  We are building for the whole continent.
                </motion.h2>
                <motion.p variants={sectionHeaderItem} className="text-base !text-[#64748B] leading-relaxed">
                  The model that solves the African business owner&apos;s problem — local compliance, local currency,
                  local language, local data — applies to every major African economy. The playbook is the same in
                  Lagos as in Nairobi as in Accra as in Johannesburg. The opportunity is 1.4 billion people.
                </motion.p>
              </motion.div>

              <motion.div
                variants={cardGridContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
                className="space-y-3"
              >
                {markets.map((m) => {
                  const s = statusStyles[m.status];
                  return (
                    <motion.div
                      key={m.name}
                      variants={cardItem}
                      className="flex items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">{m.flag}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold !text-[#0F172A]">{m.name}</div>
                          <div className="text-xs !text-[#64748B] truncate">{m.detail}</div>
                        </div>
                      </div>
                      <span
                        className="shrink-0 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: s.bg, color: s.color }}
                      >
                        {m.status}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFF] p-8 h-fit lg:sticky lg:top-28"
            >
              <div className="text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: ROYAL }}>
                The category we are creating
              </div>
              <h3 className="text-2xl font-extrabold !text-[#0F172A] leading-tight mb-4">African Business Operating System</h3>
              <p className="text-sm !text-[#64748B] leading-relaxed mb-6">
                LeadsMind does not compete in the CRM category, dominated by Salesforce and HubSpot. It does not
                compete in all-in-one platforms, where GoHighLevel and Zoho fight for global share. We are defining
                an entirely new category — one that no international platform can credibly enter without rebuilding
                their entire product, market by market, for 54 countries they have never prioritised.
              </p>
              <div className="rounded-xl p-5" style={{ backgroundColor: `${ROYAL}0C` }}>
                <p className="text-sm !text-[#0F172A] leading-relaxed font-medium">
                  The category advantage is structural: To compete with LeadsMind as an African Business OS, a US
                  platform would need to rebuild their accounting module for each country&apos;s tax authority,
                  re-price in every local currency, relocate data to African servers, and re-engineer their AI in
                  Zulu, Swahili, Yoruba, Amharic, and Arabic. That is a decade of work with zero short-term commercial
                  incentive. We own this category by default — and we intend to name it, define it loudly, and build
                  community around it before any competitor realises what they are missing.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <FinalCTA
        headline="One platform that handles everything your business needs — so you can focus on growing it, not running it."
        subtext="Every decision we make at LeadsMind is tested against a single question: does this make it easier for an African business owner to focus on growing, rather than administering, their business? If the answer is no — we don't build it."
        primaryLabel="Start free — no card required"
        primaryHref="/auth/signup-basic"
        secondaryLabel="See our pricing"
        secondaryHref="/#pricing"
        finePrint=""
      />

      <Footer />
    </div>
  );
}
