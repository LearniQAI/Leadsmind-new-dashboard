'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden py-24 md:py-[100px] px-6 text-center"
style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1a1060 40%, #0F172A 100%)' }}
    >
      {/* decorative orbs */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '-80px',
          left: '-80px',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)',
        }}
      />
      <div
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

      <div className="container mx-auto relative z-10">
        <motion.h2
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="!text-white/80 text-lg mx-auto max-w-xl mt-4 mb-10"
        >
          Join 500+ African businesses already on LeadsMind.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5"
        >
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
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="!text-white/60 text-[13px]"
        >
          No credit card required. Cancel anytime. ZAR pricing.
        </motion.p>
      </div>
    </section>
  );
}
