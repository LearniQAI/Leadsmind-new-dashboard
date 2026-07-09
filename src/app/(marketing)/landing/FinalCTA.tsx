'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionReveal } from './motion';

export default function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden py-24 md:py-[100px] px-6 text-center"
style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1a1060 40%, #0F172A 100%)' }}
    >
      {/* decorative orbs */}
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '-80px',
          left: '-80px',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)',
        }}
      />
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute pointer-events-none rounded-full"
        style={{
          bottom: '-80px',
          right: '-80px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)',
        }}
      />
      {/* dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <SectionReveal className="container mx-auto relative z-10">
        <h2
          className="font-black !text-white leading-[1.1] tracking-tight mx-auto max-w-3xl"
          style={{ fontSize: 'clamp(32px, 5vw, 60px)' }}
        >
          Ready to run your entire business from{' '}
          <span
            style={{
              backgroundImage: 'linear-gradient(135deg, #818CF8, #C084FC, #60A5FA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            one platform?
          </span>
        </h2>

        <p className="!text-white/80 text-lg mx-auto max-w-xl mt-4 mb-10">
          Join 500+ African businesses already on LeadsMind.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5">
          <Link href="/auth/signup-basic">
            <Button className="lm-shimmer h-14 px-8 text-base bg-white text-[#4F46E5] hover:bg-white hover:-translate-y-0.5 rounded-[14px] font-bold shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] transition-all duration-200 group">
              Start Your Free 14-Day Trial <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="#demo">
            <Button
              variant="ghost"
              className="h-14 px-8 rounded-[14px] border-2 border-white/40 text-white font-bold bg-transparent backdrop-blur-sm hover:bg-white/10 hover:border-white/70 transition-all duration-200"
            >
              Book a Demo
            </Button>
          </Link>
        </div>

        <p className="!text-white/60 text-[13px]">
          No credit card required. Cancel anytime. ZAR pricing.
        </p>
      </SectionReveal>
    </section>
  );
}
