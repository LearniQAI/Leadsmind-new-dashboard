'use client';

import React, { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import {
  Award,
  Zap,
  Target,
  FileText,
  Clock,
  CalendarCheck,
  MessageSquare,
  Newspaper,
  Sparkles,
  Users,
  Percent,
  CheckCircle2,
  CreditCard,
  Link2,
  TrendingUp,
  Phone,
  Globe,
  Mail,
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

/** Abstract blob composition behind a floating hero card. */
export function HeroVisual({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-[420px] mx-auto lg:mx-0 aspect-square flex items-center justify-center">
      <motion.div
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-6 -left-8 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ backgroundColor: color }}
      />
      <motion.div
        animate={{ y: [0, 14, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-0 right-0 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ backgroundColor: '#7B3FF2' }}
      />
      <motion.div
        animate={{ y: [0, 10, 0], rotate: [12, 18, 12] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-8 right-4 w-24 h-24 rounded-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: '#00B2FF' }}
      />
      <div className="relative z-10 w-full px-4">{children}</div>
    </div>
  );
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
        className="absolute inset-x-4 -bottom-3 h-full rounded-[20px] rotate-[-5deg] opacity-40 pointer-events-none"
        style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}25` }}
      />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        variants={cardEntrance}
        whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
        className="relative rounded-[20px] bg-white border border-[#F1F5F9] p-5 overflow-hidden"
        style={{
          boxShadow: `0 4px 12px rgba(10,15,61,0.08), 0 32px 64px -12px ${accent}33, 0 32px 64px -16px rgba(15,23,42,0.28)`,
          backgroundImage: `linear-gradient(180deg, ${accent}0F, rgba(255,255,255,0) 65%)`,
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

/* ---------------------------- CRM & Sales ---------------------------- */

function CrmHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={Target} label="Deal Snapshot" />
      <motion.div variants={rowVariants}>
        <div className="text-sm font-bold text-[#0F172A]">Mokoena Foods</div>
        <div className="text-[11px] text-[#94A3B8] mb-3">Contact · Sipho Dlamini</div>
      </motion.div>
      <div className="flex items-center gap-2 mb-4">
        <Badge color="#FF8A00" icon={Clock}>Proposal stage</Badge>
        <Badge color={ROYAL} icon={Percent}>70% probability</Badge>
      </div>
      <HeroMetric label="Deal value" color={ROYAL} value={18500} prefix="R " decimals={0} trend="+18% this month" />
    </FloatingCard>
  );
}

/* ---------------------------- LMS & Courses ---------------------------- */

function LmsHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={Award} label="Certificate Issued" />
      <motion.div variants={rowVariants}>
        <div className="text-sm font-bold text-[#0F172A] mb-1">Digital Marketing 101</div>
        <div className="text-[11px] text-[#94A3B8] mb-3">Thandiwe M. · Passed final quiz at 92%</div>
      </motion.div>
      <div className="flex items-center gap-2">
        <StatusPill color="#34B53A" icon={CheckCircle2}>Auto-generated</StatusPill>
        <Badge color={ROYAL} icon={CreditCard}>Enrolled via checkout</Badge>
      </div>
    </FloatingCard>
  );
}

/* ------------------------- Accounting & Finance ------------------------- */

function AccountingHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={FileText} label="Invoice #INV-1042" />
      <motion.div variants={rowVariants}>
        <div className="text-sm font-bold text-[#0F172A]">Karoo Freight (Pty) Ltd</div>
        <div className="text-[11px] text-[#94A3B8] mb-3">Issued 3 Jul · Due 17 Jul</div>
      </motion.div>
      <div className="space-y-1.5 mb-4">
        {[
          ['Logistics consulting — July', 'R 8,200.00'],
          ['Route optimisation add-on', 'R 2,750.00'],
        ].map(([label, amount]) => (
          <motion.div key={label} variants={rowVariants} className="flex items-center justify-between text-[11px] text-[#334155]">
            <span>{label}</span>
            <span className="font-semibold tabular-nums">{amount}</span>
          </motion.div>
        ))}
      </div>
      <motion.div variants={rowVariants} className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
        <StatusPill color="#34B53A" icon={CheckCircle2}>Paid</StatusPill>
        <span className="text-xl">
          <CountUpValue value={10950} prefix="R " decimals={2} color={ROYAL} />
        </span>
      </motion.div>
    </FloatingCard>
  );
}

/* ---------------------------- Invoicing ---------------------------- */

function InvoicingHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={FileText} label="Invoice #INV-2041" />
      <motion.div variants={rowVariants}>
        <div className="text-sm font-bold text-[#0F172A]">Ubuntu Fitness Studio</div>
        <div className="text-[11px] text-[#94A3B8] mb-3">Issued 2 Jul · Due 16 Jul</div>
      </motion.div>
      <div className="space-y-1.5 mb-4">
        <motion.div variants={rowVariants} className="flex items-center justify-between text-[11px] text-[#334155]">
          <span>Monthly retainer — July</span>
          <span className="font-semibold tabular-nums">R 4,200.00</span>
        </motion.div>
        <motion.div variants={rowVariants} className="flex items-center justify-between text-[11px] text-[#334155]">
          <span>Reminder 2 of 6 sent</span>
          <span className="text-[#94A3B8]">via WhatsApp</span>
        </motion.div>
      </div>
      <motion.div variants={rowVariants} className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
        <StatusPill color="#34B53A" icon={CheckCircle2}>Paid</StatusPill>
        <span className="text-xl">
          <CountUpValue value={4200} prefix="R " decimals={2} color={ROYAL} />
        </span>
      </motion.div>
    </FloatingCard>
  );
}

/* ---------------------------- Phone & IVR ---------------------------- */

function PhoneIvrHeroCard() {
  const calls: { name: string; reason: string; answered: boolean }[] = [
    { name: 'Thabo Baloyi', reason: 'Sales enquiry', answered: true },
    { name: 'Nomsa Dlamini', reason: 'Support — billing', answered: false },
  ];
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={Phone} label="Business Line · 021 555 0142" />
      <div className="space-y-2.5 mb-4">
        {calls.map((c) => (
          <motion.div
            key={c.name}
            variants={rowVariants}
            className="flex items-center justify-between text-[12px] border-b border-[#F1F5F9] pb-2.5 last:border-0 last:pb-0"
          >
            <div>
              <div className="font-semibold text-[#0F172A]">{c.name}</div>
              <div className="text-[11px] text-[#94A3B8]">{c.reason}</div>
            </div>
            <StatusPill color={c.answered ? '#34B53A' : '#FF8A00'}>{c.answered ? 'Answered' : 'Missed'}</StatusPill>
          </motion.div>
        ))}
      </div>
      <motion.div
        variants={rowVariants}
        className="flex items-center gap-1.5 text-[11px] font-semibold rounded-lg bg-[#F1F5F9] text-[#64748B] px-2.5 py-1.5 w-fit"
      >
        <CheckCircle2 className="w-3 h-3" /> "Press 2" routed to Support
      </motion.div>
    </FloatingCard>
  );
}

/* ----------------------- Sales Funnels & Website Builder ----------------------- */

function FunnelsHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={Globe} label="Funnel · Lead Capture" />
      <motion.div variants={rowVariants}>
        <div className="text-sm font-bold text-[#0F172A]">Winter Special — Landing Page</div>
        <div className="text-[11px] text-[#94A3B8] mb-3">Published on your-domain.co.za</div>
      </motion.div>
      <div className="flex items-center gap-2 mb-4">
        <Badge color={ROYAL}>3-step funnel</Badge>
        <StatusPill color="#34B53A" icon={CheckCircle2}>Live</StatusPill>
      </div>
      <HeroMetric label="Conversion rate" color={ROYAL} value={24} suffix="%" decimals={0} trend="+6% this week" />
    </FloatingCard>
  );
}

/* ------------------------- Email & WhatsApp Marketing ------------------------- */

function EmailWhatsappHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={Mail} label="Campaign · July Promo" />
      <div className="space-y-2.5 mb-4">
        <motion.div variants={rowVariants} className="flex items-center justify-between text-[12px] border-b border-[#F1F5F9] pb-2.5">
          <span className="flex items-center gap-2 text-[#334155] font-medium">
            <Mail className="w-3.5 h-3.5 text-[#1359FF]" /> Email — 1,204 sent
          </span>
          <StatusPill color="#34B53A">Delivered</StatusPill>
        </motion.div>
        <motion.div variants={rowVariants} className="flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-2 text-[#334155] font-medium">
            <MessageSquare className="w-3.5 h-3.5 text-[#1359FF]" /> WhatsApp — 620 sent
          </span>
          <StatusPill color="#34B53A">Delivered</StatusPill>
        </motion.div>
      </div>
      <HeroMetric label="Open rate" color={ROYAL} value={42} suffix="%" decimals={0} trend="+9% vs last send" />
    </FloatingCard>
  );
}

/* --------------------------- Workflow Automation --------------------------- */

function AutomationHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={Zap} label="Workflow" />
      <motion.div variants={rowVariants} className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 mb-2">
        <div className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">When</div>
        <div className="text-[12px] font-semibold text-[#334155]">Deal marked "Won"</div>
      </motion.div>
      <motion.div variants={rowVariants} className="rounded-lg bg-[#1359FF]/10 border border-[#1359FF]/20 px-3 py-2 mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-[#1359FF]">Then</div>
        <div className="text-[12px] font-semibold text-[#0F172A]">Send invoice + WhatsApp welcome</div>
      </motion.div>
      <motion.div variants={rowVariants} className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
        <span className="text-[11px] text-[#94A3B8]">Status</span>
        <StatusPill color="#34B53A" icon={CheckCircle2}>Runs automatically</StatusPill>
      </motion.div>
    </FloatingCard>
  );
}

/* --------------------------------- AI Tools --------------------------------- */

function AiToolsHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={Sparkles} label="AI Content Draft" />
      <motion.div
        variants={rowVariants}
        className="text-[12px] text-[#334155] bg-[#F8FAFC] border border-dashed border-[#1359FF]/30 rounded-lg px-3 py-2.5 mb-4"
      >
        "Here's a WhatsApp-ready follow-up for leads that went quiet after a quote — want me to send it now?"
      </motion.div>
      <div className="flex items-center gap-2 mb-1">
        <Badge color={ROYAL}>Tuned for SA English</Badge>
      </div>
      <HeroMetric label="Lead score" color={ROYAL} value={87} suffix="/100" decimals={0} />
    </FloatingCard>
  );
}

/* ---------------------------- HR & Payroll ---------------------------- */

function HrHeroCard() {
  return (
    <FloatingCard accent={ROYAL}>
      <HeroCardHeader accent={ROYAL} icon={Users} label="Employee Record" />
      <motion.div variants={rowVariants} className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-full bg-[#1359FF]/10 text-[#1359FF] flex items-center justify-center text-xs font-bold">
          LN
        </span>
        <div>
          <div className="text-sm font-bold text-[#0F172A]">Lindiwe Nkosi</div>
          <div className="text-[11px] text-[#94A3B8]">Sales Associate · Joined 2023</div>
        </div>
      </motion.div>
      <div className="flex items-center gap-2 mb-4">
        <StatusPill color="#34B53A" icon={CheckCircle2}>Payroll run: Paid</StatusPill>
      </div>
      <HeroMetric label="Annual leave remaining" color={ROYAL} value={14} suffix=" days" decimals={0} />
    </FloatingCard>
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

/** Hero floating-card content, keyed by ModuleHero.visualKey */
export const heroVisuals: Record<string, React.ReactNode> = {
  'crm-hero': <CrmHeroCard />,
  'lms-hero': <LmsHeroCard />,
  'accounting-hero': <AccountingHeroCard />,
  'invoicing-hero': <InvoicingHeroCard />,
  'phone-ivr-hero': <PhoneIvrHeroCard />,
  'funnels-hero': <FunnelsHeroCard />,
  'email-whatsapp-hero': <EmailWhatsappHeroCard />,
  'automation-hero': <AutomationHeroCard />,
  'ai-tools-hero': <AiToolsHeroCard />,
  'hr-hero': <HrHeroCard />,
  'calendar-hero': <CalendarHeroCard />,
  'communication-hero': <CommunicationHeroCard />,
  'content-hero': <ContentHeroCard />,
};
