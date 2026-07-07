'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HeroAnimation = dynamic(() => import('@/components/landing/HeroAnimation'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-2xl mx-auto h-96 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  ),
});

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: 'easeOut', delay },
});

const ANIMATED_WORDS = [
  'online courses',
  'sales funnels',
  'email marketing',
  'CRM & leads',
  'invoicing & billing',
  'HR & payroll',
  'business automation',
  'appointment booking',
];

function AnimatedHeadlineWord() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const cycle = setInterval(() => {
      setPhase('out');
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % ANIMATED_WORDS.length);
        setPhase('in');
      }, 350);
    }, 2000);
    return () => clearInterval(cycle);
  }, []);

  return (
    <span className="relative inline-block pb-3 md:pb-4">
      <span
        key={index}
        className={`inline-block text-[#4F46E5] ${phase === 'in' ? 'lm-word-in' : 'lm-word-out'}`}
      >
        {ANIMATED_WORDS[index]}
      </span>
      <span
        key={`underline-${index}`}
        className={`absolute left-0 bottom-0 h-[5px] md:h-[6px] w-full rounded-full ${
          phase === 'in' ? 'lm-underline-in' : 'lm-underline-out'
        }`}
        style={{ background: 'linear-gradient(90deg, #4F46E5, #0891B2)' }}
      />
    </span>
  );
}

export default function Hero() {
  return (
    <>
    <section className="relative pt-40 pb-16 overflow-hidden bg-white">
      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div {...fadeUp(0)} className="lm-badge-glow inline-flex items-center gap-2 py-1.5 px-4 rounded-full border border-[#4F46E5]/30 bg-[#4F46E5]/10 text-[#4F46E5] text-xs font-semibold mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          Now with LENA AI Assistant
        </motion.div>

        <motion.h1 {...fadeUp(0.1)} className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-7 leading-[1.05] !text-[#0F172A]">
          Your platform for
          <br />
          <AnimatedHeadlineWord />
        </motion.h1>

        <motion.p {...fadeUp(0.2)} className="max-w-2xl mx-auto text-lg !text-[#64748B] mb-10 leading-relaxed">
          Everything you need to run and grow your business — CRM, courses, funnels,
          invoicing, HR, automation, and more. Built for South African businesses.
        </motion.p>

        <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link href="/auth/signup-basic">
            <Button className="lm-shimmer h-14 px-8 text-base bg-[#4F46E5] hover:bg-[#4F46E5]/90 border-none rounded-full font-semibold shadow-xl shadow-[#4F46E5]/30 group">
              Start Free Trial <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <button
            onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            className="h-14 px-8 rounded-full border border-[#0F172A]/15 text-[#0F172A] flex items-center gap-2.5 font-semibold hover:bg-[#0F172A]/5 transition-colors"
          >
            <Play className="w-4 h-4 fill-current" /> Watch Demo
          </button>
        </motion.div>

        <motion.div {...fadeUp(0.4)} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#64748B]">
          <span>✓ No credit card required</span>
          <span>✓ ZAR pricing</span>
          <span>✓ SA support</span>
        </motion.div>
      </div>
    </section>

    <section className="w-full bg-white pb-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-6">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">
            Trusted by 500+ South African businesses
          </p>
        </div>
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
          <HeroAnimation />
        </div>
      </div>
    </section>
    </>
  );
}
