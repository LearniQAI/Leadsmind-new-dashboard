'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles, Users, TrendingUp, Wallet, Bell, Target, BookOpen, CalendarDays, Zap as ZapIcon, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCountUp } from './hooks';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: 'easeOut', delay },
});

function MetricCard({ label, value, prefix, suffix, icon: Icon, color, delay }: any) {
  const { ref, value: animated } = useCountUp(value, { decimals: value % 1 !== 0 ? 1 : 0 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="lm-glass rounded-2xl p-4 flex-1 min-w-[140px]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">{label}</span>
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <div className="text-2xl font-bold text-white tabular-nums">
        {prefix}
        {animated.toLocaleString('en-ZA')}
        {suffix}
      </div>
    </motion.div>
  );
}

const pipelineCols = [
  { title: 'New Leads', color: '#4F46E5', deals: ['Khumalo Textiles', 'Bright Café Group'] },
  { title: 'In Progress', color: '#F59E0B', deals: ['Ndlovu Logistics', 'Cape Coast Retail'] },
  { title: 'Won', color: '#10B981', deals: ['Sithole & Co.'] },
];

function DashboardMockup() {
  return (
    <div className="relative">
      {/* Browser chrome frame */}
      <div className="rounded-2xl border border-white/10 bg-[#0B1220] shadow-[0_40px_120px_-20px_rgba(79,70,229,0.35)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]/70" />
          <div className="ml-4 h-6 flex-1 max-w-xs rounded-md bg-white/5 flex items-center px-3 text-[11px] text-white/40">
            app.leadsmind.io/dashboard
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden sm:flex flex-col w-14 md:w-16 border-r border-white/10 bg-white/[0.02] py-4 items-center gap-4">
            {[LayoutGrid, Target, BookOpen, Wallet, Users, CalendarDays, ZapIcon].map((Icon, i) => (
              <span
                key={i}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  i === 1 ? 'bg-[#4F46E5] text-white' : 'text-white/40'
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 md:p-6">
            <div className="flex flex-wrap gap-3 mb-5">
              <MetricCard label="Total Leads" value={2482} icon={Users} color="#4F46E5" delay={0.1} />
              <MetricCard label="Revenue" value={184320} prefix="R" icon={Wallet} color="#10B981" delay={0.2} />
              <MetricCard label="Active Deals" value={37} icon={TrendingUp} color="#F59E0B" delay={0.3} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {pipelineCols.map((col, i) => (
                <motion.div
                  key={col.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                  className="rounded-xl bg-white/[0.02] border border-white/5 p-3"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wide">
                      {col.title}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {col.deals.map((deal) => (
                      <div key={deal} className="rounded-lg bg-white/5 border border-white/5 px-2.5 py-2 text-[11px] text-white/70">
                        {deal}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating toast notifications */}
      <motion.div
        initial={{ opacity: 0, x: 20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="lm-float absolute -right-4 md:-right-10 top-10 hidden md:block"
      >
        <div className="lm-glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl shadow-black/30">
          <span className="w-8 h-8 rounded-lg bg-[#10B981]/20 text-[#10B981] flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </span>
          <div className="text-xs">
            <div className="text-white font-semibold">New lead captured</div>
            <div className="text-white/40">via Form Builder</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, delay: 1.3 }}
        className="lm-float-delayed absolute -left-4 md:-left-10 bottom-6 hidden md:block"
      >
        <div className="lm-glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl shadow-black/30">
          <span className="w-8 h-8 rounded-lg bg-[#4F46E5]/20 text-[#4F46E5] flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </span>
          <div className="text-xs">
            <div className="text-white font-semibold">Invoice #1042 paid</div>
            <div className="text-white/40">R4,250.00 via PayFast</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative pt-40 pb-28 overflow-hidden bg-[#0F172A]">
      <div className="absolute inset-0 lm-mesh-bg pointer-events-none" />
      <div className="absolute inset-0 lm-dot-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#0F172A] to-transparent pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div {...fadeUp(0)} className="lm-badge-glow inline-flex items-center gap-2 py-1.5 px-4 rounded-full border border-[#4F46E5]/40 bg-[#4F46E5]/10 text-[#818CF8] text-xs font-semibold mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          Now with LENA AI Assistant
        </motion.div>

        <motion.h1 {...fadeUp(0.1)} className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-7 leading-[1.05] !text-white">
          Stop Juggling 6 Tools.
          <br />
          Run Your Entire Business
          <br />
          From{' '}
          <span className="lm-gradient-text">One Platform.</span>
        </motion.h1>

        <motion.p {...fadeUp(0.2)} className="max-w-2xl mx-auto text-lg !text-white/60 mb-10 leading-relaxed">
          LeadsMind combines CRM, LMS, Accounting, HR, Automation, and Calendar into one
          unified platform — built specifically for South African businesses.
        </motion.p>

        <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link href="/auth/signup-basic">
            <Button className="lm-shimmer h-14 px-8 text-base bg-[#4F46E5] hover:bg-[#4F46E5]/90 border-none rounded-full font-semibold shadow-xl shadow-[#4F46E5]/30 group">
              Start Free Trial <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <button
            onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            className="h-14 px-8 rounded-full border border-white/20 text-white flex items-center gap-2.5 font-semibold hover:bg-white/5 transition-colors"
          >
            <Play className="w-4 h-4 fill-current" /> Watch Demo
          </button>
        </motion.div>

        <motion.div {...fadeUp(0.4)} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/50 mb-20">
          <span>✓ No credit card required</span>
          <span>✓ ZAR pricing</span>
          <span>✓ SA support</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
          className="max-w-5xl mx-auto"
        >
          <DashboardMockup />
        </motion.div>
      </div>
    </section>
  );
}
