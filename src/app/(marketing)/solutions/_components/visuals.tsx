'use client';

import React, { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import {
  Award,
  Zap,
  Store,
  Target,
  FileText,
  ShieldCheck,
  Clock3,
  Clock,
  CalendarCheck,
  Video,
  BarChart3,
  MessageSquare,
  Bot,
  Inbox,
  Newspaper,
  LayoutTemplate,
  FormInput,
  Sparkles,
  Users,
  Percent,
  CheckCircle2,
  CreditCard,
  Link2,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

const PANEL_SHADOW = '0 2px 8px rgba(10,15,61,0.06), 0 24px 48px rgba(10,15,61,0.10)';

/** Fade + rise, used for individual rows inside a mock panel (and hero-card content items).
 *  No own initial/animate — inherits its "hidden"/"show" state from the nearest ancestor
 *  whileInView trigger, so rows stagger automatically once that ancestor's transition sets
 *  staggerChildren. */
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

/** Hero card's own arrival — a livelier overshoot than the section panels, plus it
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

/** Shared "floating dashboard panel" shell used across all feature-section visuals. */
export function MockPanelShell({ accent, children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div
      className="w-full rounded-[20px] border border-[#F1F5F9] bg-white p-2"
      style={{ boxShadow: PANEL_SHADOW }}
    >
      <div
        className="rounded-2xl border border-[#F1F5F9] p-5"
        style={
          accent
            ? { backgroundImage: `linear-gradient(180deg, ${accent}0F, rgba(255,255,255,0) 70%)` }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}

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

/** Status pill with a colored dot indicator — used consistently for any panel's completion/state badge. */
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
    <FloatingCard accent="#1359FF">
      <HeroCardHeader accent="#1359FF" icon={Target} label="Deal Snapshot" />
      <motion.div variants={rowVariants}>
        <div className="text-sm font-bold text-[#0F172A]">Mokoena Foods</div>
        <div className="text-[11px] text-[#94A3B8] mb-3">Contact · Sipho Dlamini</div>
      </motion.div>
      <div className="flex items-center gap-2 mb-4">
        <Badge color="#FF8A00" icon={Clock}>Proposal stage</Badge>
        <Badge color="#1359FF" icon={Percent}>70% probability</Badge>
      </div>
      <HeroMetric label="Deal value" color="#1359FF" value={18500} prefix="R " decimals={0} trend="+18% this month" />
    </FloatingCard>
  );
}

function CrmPipelineVisual() {
  const cols = [
    { title: 'New', color: '#1359FF', items: ['Mokoena Foods', 'Baobab Studio'] },
    { title: 'Proposal', color: '#FF8A00', items: ['Ubuntu Fitness'] },
    { title: 'Won', color: '#34B53A', items: ['Karoo Freight', 'Amanzi Spa'] },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cols.map((c) => (
        <div key={c.title} className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">{c.title}</span>
          </div>
          <div className="space-y-2">
            {c.items.map((it) => (
              <motion.div
                key={it}
                variants={rowVariants}
                className="rounded-lg bg-white border border-[#E2E8F0] px-2.5 py-2 text-[11px] font-medium text-[#334155] shadow-sm"
              >
                {it}
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CrmContactsVisual() {
  const activity = [
    { label: 'Call logged with Sipho Dlamini', time: '09:14' },
    { label: 'Proposal PDF sent to Baobab Studio', time: 'Yesterday' },
    { label: 'Note added — budget confirmed R25k', time: 'Mon' },
  ];
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-full bg-[#1359FF]/10 text-[#1359FF] flex items-center justify-center text-xs font-bold">
          SD
        </span>
        <div>
          <div className="text-sm font-bold text-[#0F172A]">Sipho Dlamini</div>
          <div className="text-[11px] text-[#94A3B8]">Baobab Studio · Decision maker</div>
        </div>
      </div>
      <div className="space-y-2.5">
        {activity.map((a) => (
          <motion.div
            key={a.label}
            variants={rowVariants}
            className="flex items-center justify-between text-[12px] border-b border-[#F1F5F9] pb-2.5"
          >
            <span className="text-[#334155]">{a.label}</span>
            <span className="text-[#94A3B8] shrink-0 ml-3">{a.time}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CrmQuoteVisual() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-[#0F172A]">Proposal #Q-1042</div>
          <div className="text-[11px] text-[#94A3B8]">Baobab Studio</div>
        </div>
        <StatusPill color="#FF8A00">Sent</StatusPill>
      </div>
      <div className="space-y-2 mb-4">
        {[
          ['CRM + Automation setup', 'R 12,500.00'],
          ['Monthly retainer (3 mo)', 'R 6,000.00'],
        ].map(([label, amount]) => (
          <motion.div
            key={label}
            variants={rowVariants}
            className="flex items-center justify-between text-xs text-[#334155] border-b border-[#E2E8F0] pb-2"
          >
            <span>{label}</span>
            <span className="font-semibold tabular-nums">{amount}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#0F172A]">Total</span>
        <span className="text-lg font-bold text-[#1359FF] tabular-nums">R 18,500.00</span>
      </div>
    </div>
  );
}

/* ---------------------------- LMS & Courses ---------------------------- */

function LmsHeroCard() {
  return (
    <FloatingCard accent="#7B3FF2">
      <HeroCardHeader accent="#7B3FF2" icon={Award} label="Certificate Issued" />
      <motion.div variants={rowVariants}>
        <div className="text-sm font-bold text-[#0F172A] mb-1">Digital Marketing 101</div>
        <div className="text-[11px] text-[#94A3B8] mb-3">Thandiwe M. · Passed final quiz at 92%</div>
      </motion.div>
      <div className="flex items-center gap-2">
        <StatusPill color="#34B53A" icon={CheckCircle2}>Auto-generated</StatusPill>
        <Badge color="#7B3FF2" icon={CreditCard}>Enrolled via checkout</Badge>
      </div>
    </FloatingCard>
  );
}

function LmsCourseBuilderVisual() {
  const lessons = [
    { title: 'Module 1 — Foundations of Digital Marketing', type: '4 lessons', done: true },
    { title: 'Module 2 — Paid Social Fundamentals', type: '6 lessons · quiz', done: true },
    { title: 'Module 3 — Email & Automation', type: '5 lessons · quiz', done: false },
  ];
  return (
    <div className="space-y-2.5">
      {lessons.map((l) => (
        <motion.div
          key={l.title}
          variants={rowVariants}
          className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-3"
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
            style={{
              backgroundColor: l.done ? '#34B53A18' : '#7B3FF218',
              color: l.done ? '#34B53A' : '#7B3FF2',
            }}
          >
            {l.done ? '✓' : ''}
          </span>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-[#0F172A] truncate">{l.title}</div>
            <div className="text-[11px] text-[#94A3B8]">{l.type}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function LmsCertificateVisual() {
  return (
    <div>
      <div className="rounded-xl border border-dashed border-[#7B3FF2]/40 bg-[#7B3FF2]/5 p-4 mb-4 text-center">
        <Award className="w-6 h-6 text-[#7B3FF2] mx-auto mb-2" />
        <div className="text-[12px] font-bold text-[#0F172A]">Certificate of Completion</div>
        <div className="text-[11px] text-[#94A3B8]">Issued automatically to Thandiwe M.</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold rounded-lg bg-[#F1F5F9] text-[#64748B] px-2.5 py-1.5">
          <Store className="w-3 h-3" /> Marketplace listing live
        </span>
      </div>
    </div>
  );
}

function LmsAutomationVisual() {
  const steps = ['Student enrolls in course', 'Welcome email sent instantly', 'Module 1 unlocked automatically'];
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <motion.div key={s} variants={rowVariants} className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-[#7B3FF2]/10 text-[#7B3FF2] flex items-center justify-center shrink-0">
            <Zap className="w-3 h-3" />
          </span>
          <span className="text-[12px] text-[#334155] font-medium">{s}</span>
          {i < steps.length - 1 && <span className="flex-1" />}
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------- Accounting & Finance ------------------------- */

function AccountingHeroCard() {
  return (
    <FloatingCard accent="#FF8A00">
      <HeroCardHeader accent="#FF8A00" icon={FileText} label="Invoice #INV-1042" />
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
          <CountUpValue value={10950} prefix="R " decimals={2} color="#FF8A00" />
        </span>
      </motion.div>
    </FloatingCard>
  );
}

function AccountingInvoiceVisual() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-[#0F172A]">Quote Q-204 → Invoice INV-205</div>
          <div className="text-[11px] text-[#94A3B8]">Converted in one click</div>
        </div>
        <StatusPill color="#FF8A00">Sent</StatusPill>
      </div>
      <div className="space-y-2 mb-4">
        {[
          ['Website care plan (monthly)', 'R 1,800.00'],
          ['VAT (15%)', 'R 270.00'],
        ].map(([label, amount]) => (
          <motion.div
            key={label}
            variants={rowVariants}
            className="flex items-center justify-between text-xs text-[#334155] border-b border-[#E2E8F0] pb-2"
          >
            <span>{label}</span>
            <span className="font-semibold tabular-nums">{amount}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#0F172A]">Total due</span>
        <span className="text-lg font-bold text-[#FF8A00] tabular-nums">R 2,070.00</span>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold rounded-lg bg-[#F1F5F9] text-[#64748B] px-2.5 py-1.5 w-fit">
        <FileText className="w-3 h-3" /> Exported as PDF
      </div>
    </div>
  );
}

function AccountingExpensesVisual() {
  const expenses = [
    { label: 'Fuel — delivery fleet', category: 'Transport', amount: 'R 1,240.00' },
    { label: 'Cloud hosting', category: 'Software', amount: 'R 640.00' },
    { label: 'Office supplies', category: 'Admin', amount: 'R 310.00' },
  ];
  return (
    <div>
      <div className="space-y-2.5 mb-4">
        {expenses.map((e) => (
          <motion.div
            key={e.label}
            variants={rowVariants}
            className="flex items-center justify-between text-[12px] border-b border-[#F1F5F9] pb-2.5"
          >
            <div>
              <div className="font-medium text-[#334155]">{e.label}</div>
              <div className="text-[11px] text-[#94A3B8]">{e.category}</div>
            </div>
            <span className="font-semibold tabular-nums text-[#334155]">{e.amount}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold rounded-lg bg-[#34B53A]/10 text-[#34B53A] px-2.5 py-1.5 w-fit">
        <ShieldCheck className="w-3 h-3" /> Reconciled against bank feed
      </div>
    </div>
  );
}

function AccountingLedgerVisual() {
  const entries = [
    { account: 'Accounts Receivable', debit: 'R 10,950', credit: '—' },
    { account: 'Sales Revenue', debit: '—', credit: 'R 9,522' },
    { account: 'VAT Output', debit: '—', credit: 'R 1,428' },
  ];
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-3">Journal entry · INV-1042</div>
      <div className="rounded-xl border border-[#E2E8F0] overflow-hidden mb-4">
        <div className="grid grid-cols-3 bg-[#F8FAFC] text-[10px] font-bold uppercase tracking-wide text-[#94A3B8] px-3 py-2">
          <span>Account</span>
          <span className="text-right">Debit</span>
          <span className="text-right">Credit</span>
        </div>
        {entries.map((e) => (
          <motion.div
            key={e.account}
            variants={rowVariants}
            className="grid grid-cols-3 px-3 py-2 text-[11px] text-[#334155] border-t border-[#F1F5F9]"
          >
            <span>{e.account}</span>
            <span className="text-right tabular-nums">{e.debit}</span>
            <span className="text-right tabular-nums">{e.credit}</span>
          </motion.div>
        ))}
      </div>
      <Badge color="#FF8A00">Standard chart of accounts</Badge>
    </div>
  );
}

/* ---------------------------- HR & Payroll ---------------------------- */

function HrHeroCard() {
  return (
    <FloatingCard accent="#FF3CAC">
      <HeroCardHeader accent="#FF3CAC" icon={Users} label="Employee Record" />
      <motion.div variants={rowVariants} className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-full bg-[#FF3CAC]/10 text-[#FF3CAC] flex items-center justify-center text-xs font-bold">
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
      <HeroMetric label="Annual leave remaining" color="#FF3CAC" value={14} suffix=" days" decimals={0} />
    </FloatingCard>
  );
}

function HrPeopleVisual() {
  const employees = [
    { name: 'Lindiwe Nkosi', role: 'Sales Associate', docs: 4 },
    { name: 'Bongani Zulu', role: 'Warehouse Lead', docs: 6 },
    { name: 'Aisha Patel', role: 'Bookkeeper', docs: 3 },
  ];
  return (
    <div>
      <div className="space-y-2.5 mb-4">
        {employees.map((e) => (
          <motion.div
            key={e.name}
            variants={rowVariants}
            className="flex items-center justify-between text-[12px] border-b border-[#F1F5F9] pb-2.5"
          >
            <div>
              <div className="font-semibold text-[#0F172A]">{e.name}</div>
              <div className="text-[11px] text-[#94A3B8]">{e.role}</div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
              <FileText className="w-3 h-3" /> {e.docs} docs
            </span>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold rounded-lg bg-[#F1F5F9] text-[#64748B] px-2.5 py-1.5 w-fit">
        <ShieldCheck className="w-3 h-3" /> Formal warning tracked on file
      </div>
    </div>
  );
}

function HrTimeVisual() {
  return (
    <div>
      <motion.div variants={rowVariants} className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-[#0F172A]">Bongani Zulu</div>
          <div className="text-[11px] text-[#94A3B8]">Clocked in 07:58 · Clocked out 17:04</div>
        </div>
        <Badge color="#FF3CAC">+1.1h overtime</Badge>
      </motion.div>
      <motion.div
        variants={rowVariants}
        className="flex items-center justify-between text-[12px] border-t border-[#F1F5F9] pt-3"
      >
        <span className="text-[#334155] font-medium">Leave request — 22–24 Aug</span>
        <StatusPill color="#34B53A">Approved</StatusPill>
      </motion.div>
    </div>
  );
}

function HrPayrollRunVisual() {
  const shifts = [
    { day: 'Mon', name: 'Lindiwe Nkosi' },
    { day: 'Tue', name: 'Bongani Zulu' },
    { day: 'Wed', name: 'Aisha Patel' },
  ];
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {shifts.map((s) => (
          <motion.div key={s.day} variants={rowVariants} className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8] mb-1">{s.day}</div>
            <div className="text-[11px] font-medium text-[#334155] truncate">{s.name}</div>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
        <span className="text-[12px] font-medium text-[#334155]">Payroll run — July</span>
        <StatusPill color="#34B53A">Payslips generated</StatusPill>
      </div>
    </div>
  );
}

/* -------------------------- Calendar & Booking -------------------------- */

function CalendarHeroCard() {
  return (
    <FloatingCard accent="#14B8A6">
      <HeroCardHeader accent="#14B8A6" icon={CalendarCheck} label="Booking Confirmed" />
      <motion.div variants={rowVariants}>
        <div className="text-sm font-bold text-[#0F172A]">Discovery Call</div>
        <div className="text-[11px] text-[#94A3B8] mb-3">with Naledi Mokoena</div>
      </motion.div>
      <div className="flex items-center gap-2 mb-4">
        <Badge color="#14B8A6" icon={Clock}>Thu, 14 Aug · 10:00</Badge>
      </div>
      <motion.div variants={rowVariants} className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
        <span className="text-[11px] text-[#94A3B8]">Status</span>
        <StatusPill color="#34B53A" icon={CheckCircle2}>Confirmed</StatusPill>
      </motion.div>
    </FloatingCard>
  );
}

function CalendarBookingVisual() {
  const slots = ['09:00', '10:30', '13:00', '15:30'];
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-3">Available today</div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {slots.map((s) => (
          <motion.div
            key={s}
            variants={rowVariants}
            className="rounded-lg border border-[#E2E8F0] text-center text-[11px] font-semibold text-[#334155] py-2"
          >
            {s}
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold rounded-lg bg-[#F1F5F9] text-[#64748B] px-2.5 py-1.5 w-fit">
        <FormInput className="w-3 h-3" /> Custom intake questions attached
      </div>
    </div>
  );
}

function CalendarMeetingsVisual() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#14B8A6]/10 text-[#14B8A6] flex items-center justify-center">
            <Video className="w-4 h-4" />
          </span>
          <div>
            <div className="text-[12px] font-bold text-[#0F172A]">Discovery Call</div>
            <div className="text-[11px] text-[#94A3B8]">Starts in 5 min</div>
          </div>
        </div>
        <span className="text-[11px] font-bold text-white bg-[#14B8A6] rounded-lg px-3 py-1.5">Join</span>
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-[#F1F5F9]">
        <Badge color="#14B8A6">Recording on</Badge>
        <Badge color="#94A3B8">2 calendars synced</Badge>
      </div>
    </div>
  );
}

function CalendarReminderVisual() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <motion.div variants={rowVariants} className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8] mb-1">This week</div>
          <div className="text-lg font-bold text-[#0F172A]">18 bookings</div>
        </motion.div>
        <motion.div variants={rowVariants} className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8] mb-1">Waitlist</div>
          <div className="text-lg font-bold text-[#0F172A]">3 waiting</div>
        </motion.div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold rounded-lg bg-[#14B8A6]/10 text-[#14B8A6] px-2.5 py-1.5 w-fit">
        <BarChart3 className="w-3 h-3" /> Cancelled slot auto-filled from waitlist
      </div>
    </div>
  );
}

/* ----------------------- Communication & Support ----------------------- */

function CommunicationHeroCard() {
  return (
    <FloatingCard accent="#1359FF">
      <HeroCardHeader accent="#1359FF" icon={MessageSquare} label="Ticket #482" />
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

function CommunicationTicketsVisual() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] font-bold text-[#0F172A]">Ticket #481 — Login issue</div>
        <StatusPill color="#FF8A00">Open</StatusPill>
      </div>
      <div className="space-y-2 mb-4 text-[11px]">
        <div className="text-[#334155] bg-[#F8FAFC] rounded-lg px-3 py-2">"I can't reset my password."</div>
        <div className="text-white bg-[#1359FF] rounded-lg px-3 py-2">Sending a fresh reset link now.</div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold rounded-lg bg-[#F1F5F9] text-[#64748B] px-2.5 py-1.5 w-fit">
        <MessageSquare className="w-3 h-3" /> Opened via embedded support widget
      </div>
    </div>
  );
}

function CommunicationLenaVisual() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-[#1359FF]/10 text-[#1359FF] flex items-center justify-center">
          <Bot className="w-4 h-4" />
        </span>
        <div className="text-[12px] font-bold text-[#0F172A]">LENA suggests a reply</div>
      </div>
      <div className="text-[12px] text-[#334155] bg-[#F8FAFC] border border-dashed border-[#1359FF]/30 rounded-lg px-3 py-2.5 mb-4">
        "Thanks for flagging this — I've checked your account and issued the refund. You'll see it in 3–5 business days."
      </div>
      <Badge color="#1359FF">Personality & knowledge base configured</Badge>
    </div>
  );
}

function CommunicationInboxVisual() {
  const items = [
    { icon: MessageSquare, label: 'Ticket #482 — Refund question', time: '2m' },
    { icon: Inbox, label: 'Email — Invoice query from Baobab Studio', time: '18m' },
    { icon: MessageSquare, label: 'Ticket #481 — Login issue', time: '1h' },
  ];
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <motion.div
          key={it.label}
          variants={rowVariants}
          className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-3"
        >
          <span className="w-7 h-7 rounded-lg bg-[#1359FF]/10 text-[#1359FF] flex items-center justify-center shrink-0">
            <it.icon className="w-3.5 h-3.5" />
          </span>
          <span className="text-[12px] font-medium text-[#334155] flex-1 truncate">{it.label}</span>
          <span className="text-[11px] text-[#94A3B8] shrink-0">{it.time}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------- Content & Marketing ------------------------- */

function ContentHeroCard() {
  return (
    <FloatingCard accent="#7B3FF2">
      <HeroCardHeader accent="#7B3FF2" icon={Newspaper} label="Blog Post" />
      <motion.div variants={rowVariants}>
        <div className="text-sm font-bold text-[#0F172A] mb-1">5 WhatsApp Templates That Actually Convert</div>
        <div className="text-[11px] text-[#94A3B8] mb-3">4 min read</div>
      </motion.div>
      <div className="flex items-center gap-2 mb-1">
        <StatusPill color="#34B53A" icon={CheckCircle2}>Published</StatusPill>
        <Badge color="#7B3FF2" icon={Link2}>Sitemap updated</Badge>
      </div>
      <HeroMetric label="SEO score" color="#7B3FF2" value={92} decimals={0} suffix="/100" />
    </FloatingCard>
  );
}

function ContentStudioVisual() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-[#7B3FF2]/10 text-[#7B3FF2] flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </span>
        <div className="text-[12px] font-bold text-[#0F172A]">AI writing assistant</div>
      </div>
      <div className="text-[12px] text-[#334155] bg-[#F8FAFC] border border-dashed border-[#7B3FF2]/30 rounded-lg px-3 py-2.5 mb-4">
        "Here's a tighter intro paragraph for your post — want me to draft the next section?"
      </div>
      <div className="flex items-center gap-2">
        <Badge color="#7B3FF2">12 categories</Badge>
        <Badge color="#94A3B8">8 comments</Badge>
      </div>
    </div>
  );
}

function ContentPagesVisual() {
  const blocks = ['Hero banner', 'Feature grid', 'Testimonial', 'CTA'];
  return (
    <div>
      <div className="rounded-xl border border-[#E2E8F0] p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <LayoutTemplate className="w-3.5 h-3.5 text-[#7B3FF2]" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Landing page editor</span>
        </div>
        <div className="space-y-1.5">
          {blocks.map((b) => (
            <motion.div
              key={b}
              variants={rowVariants}
              className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1.5 text-[11px] font-medium text-[#334155]"
            >
              {b}
            </motion.div>
          ))}
        </div>
      </div>
      <Badge color="#7B3FF2">Funnel: 3 steps · analytics on</Badge>
    </div>
  );
}

function ContentCaptureVisual() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-[#7B3FF2]/10 text-[#7B3FF2] flex items-center justify-center">
          <FormInput className="w-4 h-4" />
        </span>
        <div className="text-[12px] font-bold text-[#0F172A]">Embedded on: 5 WhatsApp Templates post</div>
      </div>
      <div className="space-y-2 mb-4">
        <motion.div variants={rowVariants} className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-[11px] text-[#94A3B8]">
          Name
        </motion.div>
        <motion.div variants={rowVariants} className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-[11px] text-[#94A3B8]">
          Email address
        </motion.div>
      </div>
      <div className="text-[11px] font-bold text-white bg-[#7B3FF2] rounded-lg px-6 py-2 text-center w-fit">
        Get the templates
      </div>
    </div>
  );
}

/* --------------------------- Automation & Workflows --------------------------- */

function AutomationHeroCard() {
  return (
    <FloatingCard accent="#00B2FF">
      <HeroCardHeader accent="#00B2FF" icon={Zap} label="Workflow" />
      <motion.div variants={rowVariants} className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 mb-2">
        <div className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">When</div>
        <div className="text-[12px] font-semibold text-[#334155]">Form submitted</div>
      </motion.div>
      <motion.div variants={rowVariants} className="rounded-lg bg-[#00B2FF]/10 border border-[#00B2FF]/20 px-3 py-2 mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-[#00B2FF]">Then</div>
        <div className="text-[12px] font-semibold text-[#0F172A]">Create contact</div>
      </motion.div>
      <motion.div variants={rowVariants} className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
        <span className="text-[11px] text-[#94A3B8]">Status</span>
        <StatusPill color="#34B53A" icon={CheckCircle2}>Runs automatically</StatusPill>
      </motion.div>
    </FloatingCard>
  );
}

function AutomationBuilderVisual() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <motion.div
          variants={rowVariants}
          className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 text-[11px] font-semibold text-[#334155]"
        >
          Trigger
        </motion.div>
        <div className="flex-1 h-px bg-[#E2E8F0]" />
        <motion.div
          variants={rowVariants}
          className="rounded-lg bg-[#00B2FF]/10 border border-[#00B2FF]/20 px-3 py-2 text-[11px] font-semibold text-[#0F172A]"
        >
          Action
        </motion.div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold rounded-lg bg-[#F1F5F9] text-[#64748B] px-2.5 py-1.5 w-fit">
        <Clock3 className="w-3 h-3" /> Full execution history logged
      </div>
    </div>
  );
}

function AutomationTriggersVisual() {
  const triggers = ['Form submission', 'Course completion'];
  return (
    <div className="space-y-2.5">
      {triggers.map((t) => (
        <motion.div key={t} variants={rowVariants} className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-3">
          <span className="w-6 h-6 rounded-full bg-[#00B2FF]/10 text-[#00B2FF] flex items-center justify-center shrink-0">
            <Zap className="w-3 h-3" />
          </span>
          <span className="text-[12px] font-medium text-[#334155]">{t}</span>
        </motion.div>
      ))}
    </div>
  );
}

function AutomationActionsVisual() {
  const actions = ['Send email', 'Send WhatsApp message', 'Create task'];
  return (
    <div className="space-y-2.5">
      {actions.map((a) => (
        <motion.div key={a} variants={rowVariants} className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-3">
          <span className="w-6 h-6 rounded-full bg-[#00B2FF]/10 text-[#00B2FF] flex items-center justify-center shrink-0">
            <Zap className="w-3 h-3" />
          </span>
          <span className="text-[12px] font-medium text-[#334155]">{a}</span>
        </motion.div>
      ))}
    </div>
  );
}

/** Hero floating-card content, keyed by ModuleHero.visualKey */
export const heroVisuals: Record<string, React.ReactNode> = {
  'crm-hero': <CrmHeroCard />,
  'lms-hero': <LmsHeroCard />,
  'accounting-hero': <AccountingHeroCard />,
  'hr-hero': <HrHeroCard />,
  'calendar-hero': <CalendarHeroCard />,
  'communication-hero': <CommunicationHeroCard />,
  'automation-hero': <AutomationHeroCard />,
  'content-hero': <ContentHeroCard />,
};

/** Feature-section panel content, keyed by ModuleFeatureSection.visualKey */
export const sectionVisuals: Record<string, React.ReactNode> = {
  'crm-pipeline': <CrmPipelineVisual />,
  'crm-contacts': <CrmContactsVisual />,
  'crm-quote': <CrmQuoteVisual />,
  'lms-course-builder': <LmsCourseBuilderVisual />,
  'lms-certificate': <LmsCertificateVisual />,
  'lms-automation': <LmsAutomationVisual />,
  'accounting-invoice': <AccountingInvoiceVisual />,
  'accounting-reports': <AccountingExpensesVisual />,
  'accounting-ledger': <AccountingLedgerVisual />,
  'hr-people': <HrPeopleVisual />,
  'hr-time': <HrTimeVisual />,
  'hr-payroll': <HrPayrollRunVisual />,
  'calendar-booking': <CalendarBookingVisual />,
  'calendar-meetings': <CalendarMeetingsVisual />,
  'calendar-reminders': <CalendarReminderVisual />,
  'communication-tickets': <CommunicationTicketsVisual />,
  'communication-lena': <CommunicationLenaVisual />,
  'communication-inbox': <CommunicationInboxVisual />,
  'automation-builder': <AutomationBuilderVisual />,
  'automation-triggers': <AutomationTriggersVisual />,
  'automation-actions': <AutomationActionsVisual />,
  'content-calendar': <ContentStudioVisual />,
  'content-pages': <ContentPagesVisual />,
  'content-campaign': <ContentCaptureVisual />,
};
