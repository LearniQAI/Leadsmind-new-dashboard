'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { painPoints } from './data';

export default function Problem() {
  return (
    <section className="py-28 bg-[#0F172A] relative overflow-hidden">
      <div className="absolute inset-0 lm-dot-grid opacity-30 pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <div className="text-[#F59E0B] font-bold uppercase tracking-[0.25em] text-xs mb-4">
            The Problem
          </div>
          <h2 className="text-3xl md:text-5xl font-bold !text-white leading-tight">
            South African businesses are drowning in disconnected tools
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {painPoints.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -6 }}
              className="lm-glass rounded-2xl p-8 border-l-4 border-l-[#F59E0B] transition-shadow hover:shadow-2xl hover:shadow-[#F59E0B]/10"
            >
              <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center mb-6">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold !text-white mb-3">{p.title}</h3>
              <p className="!text-white/50 leading-relaxed text-sm">{p.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
