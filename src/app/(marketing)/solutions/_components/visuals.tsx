'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, animate } from 'framer-motion';
import {
  Clock,
  CalendarCheck,
  MessageSquare,
  Newspaper,
  CheckCircle2,
  Link2,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

/** Fixed brand accent every hero card's FloatingCard/header/generic badges use —
 *  module pages no longer vary this by module, only the dropdown tiles do. */
const ROYAL = '#1359FF';

/** Fade + rise, used for individual rows inside a hero card.
 *  No own initial/animate — inherits its "hidden"/"show" state from the nearest ancestor
 *  whileInView trigger, so rows stagger automatically once that ancestor's transition sets
 *  staggerChildren. */
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

/** Hero card's own arrival — a livelier overshoot than section panels, plus it
 *  orchestrates the staggered reveal of its children (which just carry `rowVariants`). */
const cardEntrance = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'backOut' as const, staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

/** Soft, neutral backdrop behind a floating hero card — a single barely-visible glow, not a colorful blob composition. */
export function HeroVisual({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-[560px] mx-auto lg:mx-0 aspect-square flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}0A 0%, transparent 68%)` }}
      />
      <div className="relative z-10 w-full px-4">{children}</div>
    </div>
  );
}

/** Real product screenshot presented in a premium "browser window" frame — thin top
 *  chrome bar with traffic-light dots, floating shadow, ambient hover lift. Mirrors
 *  FloatingCard's presentation language (rounded corners, neutral shadow, hover rise)
 *  so screenshot-backed pages and remaining fake-data hero cards still read as one family. */
function ScreenshotVisual({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) {
  return (
    <motion.div
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      className="relative w-full max-w-[640px] mx-auto"
    >
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        variants={cardEntrance}
        whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
        className="relative rounded-[20px] bg-white border border-[#F1F5F9] overflow-hidden"
        style={{
          boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 24px 48px -16px rgba(15,23,42,0.14)',
        }}
      >
        {/* browser-chrome top bar */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-[#F8FAFC] border-b border-[#F1F5F9]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F87171]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
        </div>
        <div className="relative w-full bg-[#F8FAFC]">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes="(min-width: 1024px) 640px, 90vw"
            className="w-full h-auto"
            priority
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Module `visualKey` → real product screenshot in /public/images/solutions.
 *  Modules absent here (calendar-hero, communication-hero, content-hero) have no
 *  screenshot yet and keep rendering their fake-data FloatingCard below. */
const heroScreenshots: Record<string, { src: string; alt: string; width: number; height: number }> = {
  'crm-hero': { src: '/images/solutions/crm.png', alt: 'LeadsMind CRM & Sales pipeline screenshot', width: 1536, height: 1024 },
  'lms-hero': { src: '/images/solutions/lms.png', alt: 'LeadsMind LMS & Courses screenshot', width: 4096, height: 4096 },
  'accounting-hero': { src: '/images/solutions/accounting-finance.png', alt: 'LeadsMind Accounting & Finance screenshot', width: 4096, height: 4096 },
  'invoicing-hero': { src: '/images/solutions/invoice.png', alt: 'LeadsMind Invoicing screenshot', width: 4096, height: 4096 },
  'phone-ivr-hero': { src: '/images/solutions/phone-and-ivr.png', alt: 'LeadsMind Phone & IVR screenshot', width: 4096, height: 4096 },
  'funnels-hero': { src: '/images/solutions/sales.png', alt: 'LeadsMind Sales Funnels & Website Builder screenshot', width: 4096, height: 4096 },
  'email-whatsapp-hero': { src: '/images/solutions/email-whatsapp-marketing.png', alt: 'LeadsMind Email & WhatsApp Marketing screenshot', width: 4096, height: 4096 },
  'automation-hero': { src: '/images/solutions/automation.png', alt: 'LeadsMind Workflow Automation screenshot', width: 1535, height: 1024 },
  'ai-tools-hero': { src: '/images/solutions/ai-tools.png', alt: 'LeadsMind AI Tools screenshot', width: 1459, height: 1078 },
  'hr-hero': { src: '/images/solutions/payroll.png', alt: 'LeadsMind HR & Payroll screenshot', width: 1536, height: 1024 },
};

/** Renders the real screenshot for `visualKey` when one exists, otherwise falls back
 *  to the fake-data FloatingCard from `heroVisuals`. */
export function ModuleHeroVisual({ visualKey }: { visualKey: string }) {
  const shot = heroScreenshots[visualKey];
  if (shot) return <ScreenshotVisual src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} />;
  return <>{heroVisuals[visualKey]}</>;
}

/** Shared floating hero-card shell — deeper layered shadow, accent glow, top accent bar,
 *  a "peeking" second card behind it for stacked-data depth, persistent ambient float,
 *  and a choreographed backOut entrance that staggers its children in. */
function FloatingCard({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <motion.div
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      className="relative w-full max-w-[300px] mx-auto"
    >
      {/* peeking second card — suggests a stack of real data, not one isolated card */}
      <div
        className="absolute inset-x-4 -bottom-3 h-full rounded-[20px] rotate-[-5deg] bg-[#F8FAFC] border border-[#E2E8F0] pointer-events-none"
      />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        variants={cardEntrance}
        whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
        className="relative rounded-[20px] bg-white border border-[#F1F5F9] p-5 overflow-hidden"
        style={{
          boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 24px 48px -16px rgba(15,23,42,0.14)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accent }} />
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Slow, soft "this is live" pulse — sits next to a hero card's eyebrow label. */
function LiveDot({ color }: { color: string }) {
  return (
    <motion.span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{ backgroundColor: color }}
      animate={{ opacity: [1, 0.35, 1], scale: [1, 0.8, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

/** Shared eyebrow header row for hero cards — icon chip + label + live pulse dot. */
function HeroCardHeader({ accent, icon: Icon, label }: { accent: string; icon: LucideIcon; label: string }) {
  return (
    <motion.div variants={rowVariants} className="flex items-center gap-2 mb-3">
      <span
        className="w-6 h-6 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${accent}18`, color: accent }}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] inline-flex items-center gap-1.5">
        {label}
        <LiveDot color={accent} />
      </span>
    </motion.div>
  );
}

/** Counts up from 0 to `value` once mounted — the hero card's key metric shouldn't just appear. */
function CountUpValue({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  color,
  delay = 0.75,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  color: string;
  delay?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.7,
      ease: 'easeOut',
      delay,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, delay]);

  const formatted = display.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className="tabular-nums font-extrabold" style={{ color }}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/** Bottom "hero metric" row shared by cards with a plain text label (Deal value, Annual
 *  leave remaining, SEO score…) — emphasized count-up value, optional trend indicator. */
function HeroMetric({
  label,
  color,
  value,
  prefix,
  suffix,
  decimals = 0,
  trend,
}: {
  label: string;
  color: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: string;
}) {
  return (
    <motion.div variants={rowVariants} className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
      <span className="text-[11px] text-[#94A3B8]">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-xl">
          <CountUpValue value={value} prefix={prefix} suffix={suffix} decimals={decimals} color={color} />
        </span>
        {trend && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#34B53A]">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </span>
    </motion.div>
  );
}

function Badge({ color, icon: Icon, children }: { color: string; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <motion.span
      variants={rowVariants}
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </motion.span>
  );
}

/** Status pill with a colored dot indicator — used consistently for any card's completion/state badge. */
function StatusPill({ color, icon: Icon, children }: { color: string; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <motion.span
      variants={rowVariants}
      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: `${color}18`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </motion.span>
  );
}

/* -------------------------- Calendar & Booking -------------------------- */

function CalendarHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={CalendarCheck} label="Booking Confirmed" />
      <motion.div variants={rowVariants}>
        <div className="text-sm font-bold text-[#0F172A]">Discovery Call</div>
        <div className="text-[11px] text-[#94A3B8] mb-3">with Naledi Mokoena</div>
      </motion.div>
      <div className="flex items-center gap-2 mb-4">
        <Badge color={ROYAL} icon={Clock}>Thu, 14 Aug · 10:00</Badge>
      </div>
      <motion.div variants={rowVariants} className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
        <span className="text-[11px] text-[#94A3B8]">Status</span>
        <StatusPill color="#34B53A" icon={CheckCircle2}>Confirmed</StatusPill>
      </motion.div>
    </FloatingCard>
  );
}

/* ----------------------- Communication & Support ----------------------- */

function CommunicationHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={MessageSquare} label="Ticket #482" />
      <motion.div variants={rowVariants} className="text-[12px] text-[#334155] bg-[#F8FAFC] rounded-lg px-3 py-2 mb-2">
        "Can I get a refund on my last invoice?"
      </motion.div>
      <motion.div variants={rowVariants} className="text-[12px] text-white bg-[#1359FF] rounded-lg px-3 py-2 mb-3">
        Hi Naledi — yes, I've processed that now.
      </motion.div>
      <motion.div variants={rowVariants} className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
        <span className="text-[11px] text-[#94A3B8]">Agent · Zanele</span>
        <StatusPill color="#34B53A" icon={CheckCircle2}>Resolved</StatusPill>
      </motion.div>
    </FloatingCard>
  );
}

/* ------------------------- Content & Marketing ------------------------- */

function ContentHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={Newspaper} label="Blog Post" />
      <motion.div variants={rowVariants}>
        <div className="text-sm font-bold text-[#0F172A] mb-1">5 WhatsApp Templates That Actually Convert</div>
        <div className="text-[11px] text-[#94A3B8] mb-3">4 min read</div>
      </motion.div>
      <div className="flex items-center gap-2 mb-1">
        <StatusPill color="#34B53A" icon={CheckCircle2}>Published</StatusPill>
        <Badge color={ROYAL} icon={Link2}>Sitemap updated</Badge>
      </div>
      <HeroMetric label="SEO score" color={ROYAL} value={92} decimals={0} suffix="/100" />
    </FloatingCard>
  );
}

/** Fake-data FloatingCard content for modules with no real screenshot yet,
 *  keyed by ModuleHero.visualKey. Consumed only via `ModuleHeroVisual`'s fallback. */
const heroVisuals: Record<string, React.ReactNode> = {
  'calendar-hero': <CalendarHeroCard />,
  'communication-hero': <CommunicationHeroCard />,
  'content-hero': <ContentHeroCard />,
};
