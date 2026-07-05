'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FinalCTA() {
  return (
    <section className="py-28 bg-[#0F172A] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4F46E5]/25 rounded-full blur-[150px] pointer-events-none lm-float" />
      <div className="absolute inset-0 lm-dot-grid opacity-30 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-6xl font-bold !text-white leading-tight mb-6 max-w-3xl mx-auto">
            Ready to run your entire business from one platform?
          </h2>
          <p className="!text-white/50 text-lg mb-10 max-w-xl mx-auto">
            Join 500+ South African businesses already on LeadsMind.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/auth/signup-basic">
              <Button className="lm-shimmer h-14 px-8 text-base bg-[#4F46E5] hover:bg-[#4F46E5]/90 rounded-full font-semibold shadow-xl shadow-[#4F46E5]/30 group">
                Start Your Free 14-Day Trial <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button variant="ghost" className="h-14 px-8 rounded-full border border-white/20 text-white font-semibold hover:bg-white/5">
                Book a Demo
              </Button>
            </Link>
          </div>

          <p className="!text-white/30 text-sm">No credit card required. Cancel anytime. ZAR pricing.</p>
        </motion.div>
      </div>
    </section>
  );
}
