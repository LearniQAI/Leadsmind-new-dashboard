'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Target,
  Sparkles,
  Puzzle,
  TrendingUp,
  Lightbulb,
  Globe,
  Check,
  ChevronDown,
  FileText,
  Search,
  MessageSquare,
  ClipboardCheck,
  Users,
  Rocket,
  Wallet,
  BookOpen,
  Zap,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import '../../landing/landing.css';
import Navbar from '../../landing/Navbar';
import Footer from '../../landing/Footer';
import FinalCTA from '../../landing/FinalCTA';

const ROYAL = '#1359FF';
const ORANGE = '#FF8A00';

const TALENT_COMMUNITY_HREF = 'mailto:careers@leadsmind.io';
const OPEN_POSITIONS_HREF = '#departments';

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
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

const iconPop = {
  hidden: { scale: 0.4, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { duration: 0.5, ease: 'backOut' as const } },
};
const textReveal = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const, delay: 0.15 } },
};
const lineDraw = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.6, ease: 'easeInOut' as const, delay: 0.2 } },
};

// Card titles/icons are Nelly's copy; descriptions are drafted placeholders pending her final review.
const whyWorkCards = [
  {
    icon: Target,
    title: 'Build Products That Matter',
    description: 'Your work will directly power the tools thousands of African entrepreneurs rely on every day.',
  },
  {
    icon: Sparkles,
    title: 'Work With Cutting-Edge AI',
    description: 'Build with the latest AI and automation technology, not legacy systems bolted together.',
  },
  {
    icon: Puzzle,
    title: 'Solve Real Problems',
    description: 'Tackle real challenges faced by business owners across the continent, not abstract ones.',
  },
  {
    icon: TrendingUp,
    title: 'Grow With the Company',
    description: 'As LeadsMind scales across Africa, so will your role, your skills, and your opportunities.',
  },
  {
    icon: Lightbulb,
    title: 'Innovation Without Limits',
    description: 'We move fast and give you the freedom to experiment, build, and challenge the status quo.',
  },
  {
    icon: Globe,
    title: 'Make Global Impact',
    description: 'Help build a platform that changes how millions of businesses operate across Africa and beyond.',
  },
];

const cultureItems = [
  { title: 'Ownership', description: 'We take responsibility for our work and deliver with excellence.' },
  { title: 'Customer Obsession', description: 'Every product decision starts with the customer.' },
  { title: 'Innovation', description: "We constantly challenge the status quo and build what's next." },
  { title: 'Integrity', description: 'We do the right thing—even when nobody is watching.' },
  { title: 'Continuous Learning', description: 'Technology evolves every day, and so do we.' },
  { title: 'Collaboration', description: 'Great products are built by great teams.' },
];

const lookingForList = [
  'Think creatively',
  'Learn quickly',
  'Love building products',
  'Take initiative',
  'Communicate openly',
  'Care deeply about customers',
  'Enjoy working in fast-moving environments',
  'Want to make a meaningful impact',
];

const departments = [
  {
    title: 'Engineering',
    description: 'Build scalable software powering businesses across Africa.',
    roles: ['Full Stack Developers', 'Backend Engineers', 'Frontend Engineers', 'Mobile Developers', 'DevOps Engineers', 'QA Engineers', 'Platform Engineers'],
  },
  {
    title: 'Artificial Intelligence',
    description: "Help create Africa's next generation of AI business tools.",
    roles: ['AI Engineers', 'Machine Learning Engineers', 'NLP Engineers', 'Prompt Engineers', 'AI Product Specialists', 'Data Scientists'],
  },
  {
    title: 'Product',
    description: 'Create experiences customers love.',
    roles: ['Product Managers', 'UX Designers', 'UI Designers', 'Product Researchers', 'Product Analysts'],
  },
  {
    title: 'Sales',
    description: 'Help businesses discover better ways to grow.',
    roles: ['Account Executives', 'Sales Development Representatives', 'Enterprise Sales', 'Partnership Managers'],
  },
  {
    title: 'Marketing',
    description: 'Tell the LeadsMind story across Africa.',
    roles: ['Content Marketing', 'SEO Specialists', 'Performance Marketing', 'Brand Marketing', 'Video Creators', 'Social Media Managers'],
  },
  {
    title: 'Customer Success',
    description: 'Deliver exceptional customer experiences.',
    roles: ['Customer Success Managers', 'Technical Support', 'Onboarding Specialists', 'Training Consultants'],
  },
  {
    title: 'Operations',
    description: 'Keep everything running smoothly.',
    roles: ['HR', 'Finance', 'Legal', 'Administration', 'Recruitment', 'Business Operations'],
  },
];

const lifeExpectations = [
  'Flexible working arrangements',
  'Remote-friendly culture',
  'Modern technology stack',
  'Continuous learning opportunities',
  'Professional development',
  'Career progression',
  'Collaborative environment',
  'Diverse and inclusive team',
  'Innovation-focused culture',
  'Opportunities to lead new initiatives',
];

const benefits = [
  { icon: Wallet, title: 'Competitive Compensation', description: 'We reward great talent with competitive salaries.' },
  { icon: BookOpen, title: 'Learning Budget', description: 'Continue growing through courses, certifications, books, and conferences.' },
  { icon: TrendingUp, title: 'Career Growth', description: 'Opportunities to move into leadership and specialist roles as we scale.' },
  { icon: Zap, title: 'Latest Technology', description: 'Work with modern tools and cutting-edge technologies.' },
  { icon: Layers, title: 'Flexible Work', description: 'Balance productivity with flexibility.' },
  { icon: Rocket, title: 'Meaningful Work', description: 'Build products used by thousands—and eventually millions—of businesses.' },
];

const hiringSteps = [
  { icon: FileText, title: 'Apply Online', description: 'Submit your application through our careers portal.' },
  { icon: Search, title: 'Initial Review', description: 'Our recruitment team reviews your experience and skills.' },
  { icon: MessageSquare, title: 'Interview', description: 'Meet with our team to discuss your experience, goals, and problem-solving approach.' },
  { icon: ClipboardCheck, title: 'Skills Assessment', description: 'Depending on the role, you may complete a practical assessment or case study.' },
  { icon: Users, title: 'Final Conversation', description: 'Meet your future team and leadership.' },
  { icon: Rocket, title: 'Welcome to LeadsMind', description: 'Start building the future with us.' },
];

function DepartmentAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <motion.div
      variants={cardGridContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      className="max-w-3xl mx-auto space-y-3"
    >
      {departments.map((dept, i) => {
        const isOpen = open === i;
        return (
          <motion.div
            key={dept.title}
            variants={cardItem}
            className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white"
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span>
                <span className="block font-bold text-[#0F172A] text-base">{dept.title}</span>
                <span className="block text-sm !text-[#64748B] mt-0.5">{dept.description}</span>
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${ROYAL}14`, color: ROYAL }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-5 flex flex-wrap gap-2">
                    {dept.roles.map((role) => (
                      <span
                        key={role}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full border"
                        style={{ backgroundColor: `${ROYAL}0C`, color: ROYAL, borderColor: `${ROYAL}22` }}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function HiringStepsRow({ steps, startIndex }: { steps: typeof hiringSteps; startIndex: number }) {
  return (
    <motion.div
      variants={heroContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      className="relative max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6"
    >
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <React.Fragment key={s.title}>
            <motion.div variants={heroContainer} className="relative text-center flex flex-col items-center">
              <motion.div
                variants={iconPop}
                className="relative z-10 w-16 h-16 rounded-2xl text-white flex items-center justify-center mb-6 shadow-lg"
                style={{ backgroundColor: ROYAL, boxShadow: `0 8px 24px -6px ${ROYAL}66` }}
              >
                <Icon className="w-7 h-7" />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center">
                  {startIndex + i + 1}
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
  );
}

export default function CareersContent({ user }: { user?: any }) {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar user={user} />

      {/* HERO */}
      <section
        className="relative overflow-hidden pt-[140px] pb-20 md:pt-[168px] md:pb-28"
        style={{ background: `linear-gradient(180deg, #FFFFFF 0%, ${ROYAL}12 100%)` }}
      >
        <div className="absolute inset-0 lm-dot-grid-light opacity-60 pointer-events-none" />
        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="show"
          className="container mx-auto px-6 relative z-10 max-w-3xl text-center"
        >
          <motion.div variants={heroItem} className="text-xs font-bold uppercase tracking-[0.25em] mb-5" style={{ color: ROYAL }}>
            Careers
          </motion.div>
          <motion.h1
            variants={heroItem}
            className="text-[clamp(34px,5vw,56px)] font-extrabold !text-[#0F172A] leading-[1.08] tracking-tight mb-6"
          >
            Build the Future of Business in Africa
          </motion.h1>
          <motion.p variants={heroItem} className="text-xl font-semibold !text-[#0F172A] leading-relaxed mb-6">
            Join the team building Africa&apos;s first Business Operating System.
          </motion.p>
          <motion.p variants={heroItem} className="text-base !text-[#64748B] leading-relaxed mb-6 max-w-2xl mx-auto">
            At LeadsMind, we&apos;re not just creating software—we&apos;re building the platform that will power millions
            of businesses across Africa. From AI and automation to CRM, accounting, education, marketing, and business
            operations, we&apos;re bringing everything entrepreneurs need into one intelligent platform. This vision is
            aligned with LeadsMind&apos;s mission to become a South African Business OS that replaces disconnected
            business tools with one integrated platform.
          </motion.p>
          <motion.p variants={heroItem} className="text-base font-semibold !text-[#0F172A] leading-relaxed mb-10 max-w-2xl mx-auto">
            Your work won&apos;t just build products. It will help businesses grow, create jobs, and transform economies.
          </motion.p>
          <motion.div variants={heroItem} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={OPEN_POSITIONS_HREF}>
              <Button
                className="lm-shimmer h-14 px-8 text-base text-white rounded-[14px] font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5 group"
                style={{ backgroundColor: ORANGE, boxShadow: `0 12px 32px -8px ${ORANGE}66` }}
              >
                View Open Positions
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link
              href={TALENT_COMMUNITY_HREF}
              className="h-14 px-8 rounded-[14px] border border-[#0F172A]/15 text-[#0F172A] inline-flex items-center justify-center gap-2.5 font-semibold hover:bg-[#0F172A]/5 transition-colors"
            >
              Join Our Talent Community
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* WHY WORK AT LEADSMIND */}
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
              Why Join Us
            </motion.div>
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight">
              Why Work at LeadsMind
            </motion.h2>
          </motion.div>

          <motion.div
            variants={cardGridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
          >
            {whyWorkCards.map((c) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.title}
                  variants={cardItem}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_44px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-300"
                >
                  <span
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-5"
                    style={{ backgroundColor: ROYAL }}
                  >
                    <Icon className="w-5.5 h-5.5" />
                  </span>
                  <h3 className="text-lg font-bold !text-[#0F172A] mb-2.5">{c.title}</h3>
                  <p className="text-sm !text-[#64748B] leading-relaxed">{c.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* OUR MISSION */}
      <section className="py-20 bg-[#FAFBFF] border-t border-b border-[#E2E8F0] text-center">
        <div className="container mx-auto px-6 max-w-2xl">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={connectiveFade}>
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ROYAL }}>
              Our Mission
            </div>
            <h2 className="text-[clamp(24px,3.4vw,32px)] font-extrabold !text-[#0F172A] leading-tight mb-4">
              Empower Every Business in Africa
            </h2>
            <p className="!text-[#64748B] text-[15px] leading-relaxed">
              Our mission is simple: Build one platform that handles everything a business needs—so entrepreneurs can
              focus on growing their business instead of managing disconnected software. Every decision we make is
              guided by one question: &ldquo;Does this make it easier for business owners to grow?&rdquo; That
              philosophy is reflected throughout LeadsMind&apos;s strategic positioning and brand promise.
            </p>
          </motion.div>
        </div>
      </section>

      {/* OUR CULTURE */}
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
              Our Culture
            </motion.div>
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight">
              How We Work Together
            </motion.h2>
          </motion.div>

          <motion.div
            variants={cardGridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto"
          >
            {cultureItems.map((item) => (
              <motion.div key={item.title} variants={cardItem} className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                <div className="font-bold text-[15px] !text-[#0F172A] mb-2">{item.title}</div>
                <p className="text-sm !text-[#64748B] leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* WHO WE'RE LOOKING FOR */}
      <section className="py-20 md:py-24 bg-[#FAFBFF]">
        <div className="container mx-auto px-6">
          <motion.div
            variants={sectionHeaderContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="max-w-2xl mx-auto text-center mb-12"
          >
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight mb-4">
              Who We&apos;re Looking For
            </motion.h2>
            <motion.p variants={sectionHeaderItem} className="text-base !text-[#64748B] leading-relaxed">
              We hire passionate people who love solving difficult problems. Whether you&apos;re experienced or just
              starting your career, we&apos;re interested in people who:
            </motion.p>
          </motion.div>

          <motion.div
            variants={cardGridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 max-w-2xl mx-auto"
          >
            {lookingForList.map((trait) => (
              <motion.div key={trait} variants={cardItem} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 mt-[3px] shrink-0" style={{ color: ROYAL }} />
                <span className="text-sm font-medium !text-[#334155]">{trait}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* DEPARTMENTS */}
      <section id="departments" className="py-20 md:py-24 bg-white scroll-mt-24">
        <div className="container mx-auto px-6">
          <motion.div
            variants={sectionHeaderContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="max-w-2xl mx-auto text-center mb-14"
          >
            <motion.div variants={sectionHeaderItem} className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ROYAL }}>
              Departments
            </motion.div>
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight">
              Where You Could Fit In
            </motion.h2>
          </motion.div>

          <DepartmentAccordion />
        </div>
      </section>

      {/* LIFE AT LEADSMIND */}
      <section className="py-20 md:py-24 bg-[#FAFBFF]">
        <div className="container mx-auto px-6">
          <motion.div
            variants={sectionHeaderContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="max-w-2xl mx-auto text-center mb-14"
          >
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight">
              We believe great people deserve a great workplace.
            </motion.h2>
          </motion.div>

          <motion.div
            variants={cardGridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 max-w-2xl mx-auto mb-16"
          >
            {lifeExpectations.map((item) => (
              <motion.div key={item} variants={cardItem} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 mt-[3px] shrink-0" style={{ color: ROYAL }} />
                <span className="text-sm font-medium !text-[#334155]">{item}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={connectiveFade}
            className="text-center mb-10"
          >
            <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ROYAL }}>
              Employee Benefits
            </div>
          </motion.div>

          <motion.div
            variants={cardGridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
          >
            {benefits.map((b) => {
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
                  <p className="text-sm !text-[#64748B] leading-relaxed">{b.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* OUR HIRING PROCESS */}
      <section className="py-24 md:py-28 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            variants={sectionHeaderContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="max-w-2xl mx-auto text-center mb-20"
          >
            <motion.div variants={sectionHeaderItem} className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ROYAL }}>
              How to Join
            </motion.div>
            <motion.h2 variants={sectionHeaderItem} className="text-[clamp(26px,3.6vw,38px)] font-extrabold !text-[#0F172A] leading-tight">
              Our Hiring Process
            </motion.h2>
          </motion.div>

          <HiringStepsRow steps={hiringSteps.slice(0, 3)} startIndex={0} />
          <div className="mt-16">
            <HiringStepsRow steps={hiringSteps.slice(3, 6)} startIndex={3} />
          </div>
        </div>
      </section>

      {/* DON'T SEE THE RIGHT ROLE? */}
      <section className="py-20 bg-[#FAFBFF] border-t border-b border-[#E2E8F0]">
        <div className="container mx-auto px-6 max-w-2xl text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={connectiveFade}>
            <h2 className="text-[clamp(24px,3.4vw,32px)] font-extrabold !text-[#0F172A] leading-tight mb-4">
              Don&apos;t See the Right Role?
            </h2>
            <p className="!text-[#64748B] text-[15px] leading-relaxed mb-8 max-w-xl mx-auto">
              We&apos;re always looking for exceptional people. If your dream role isn&apos;t listed today, we&apos;d
              still love to hear from you. Submit your CV and we&apos;ll contact you when the right opportunity
              becomes available.
            </p>
            <Link href={TALENT_COMMUNITY_HREF}>
              <Button
                className="lm-shimmer h-14 px-8 text-base text-white rounded-[14px] font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5 group"
                style={{ backgroundColor: ORANGE, boxShadow: `0 12px 32px -8px ${ORANGE}66` }}
              >
                Join Our Talent Community
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CLOSING SECTION */}
      <section className="py-20 md:py-24 bg-white text-center">
        <div className="container mx-auto px-6 max-w-2xl">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={connectiveFade}>
            <h2 className="text-[clamp(24px,3.4vw,32px)] font-extrabold !text-[#0F172A] leading-tight mb-4">
              Why You&apos;ll Love Building at LeadsMind
            </h2>
            <p className="!text-[#64748B] text-[15px] leading-relaxed">
              We&apos;re creating far more than another software company. We&apos;re building Africa&apos;s Business
              Operating System—a platform designed to replace dozens of disconnected business tools with one
              intelligent, integrated solution tailored for African businesses. The strategy emphasizes local
              innovation, AI, compliance, automation, and long-term expansion across Africa. If you&apos;re excited by
              big challenges, meaningful work, rapid growth, and the opportunity to help shape the future of business
              technology in Africa, LeadsMind is the place for you.
            </p>
          </motion.div>
        </div>
      </section>

      <FinalCTA
        headline="Ready to Build the Future?"
        subtext="Join a team that's redefining how businesses across Africa operate."
        primaryLabel="Explore Open Positions"
        primaryHref={OPEN_POSITIONS_HREF}
        secondaryLabel="Send Your CV"
        secondaryHref={TALENT_COMMUNITY_HREF}
        finePrint=""
      />

      <Footer />
    </div>
  );
}
