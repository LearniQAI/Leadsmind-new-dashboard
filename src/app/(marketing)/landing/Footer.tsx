'use client';

import React from 'react';
import Link from 'next/link';
import { Zap, Linkedin, Twitter, Youtube, Facebook } from 'lucide-react';
import { footerLinks } from './data';

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] border-t border-white/10">
      <div className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group w-fit">
              <span className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,#4F46E5_0%,#7C3AED_50%,#0891B2_100%)] flex items-center justify-center shadow-lg shadow-[#4F46E5]/30 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-white fill-white" />
              </span>
              <span className="text-lg font-bold tracking-tight text-white">LeadsMind</span>
            </Link>
            <p className="!text-white/40 text-sm leading-relaxed max-w-xs mb-6">
              The all-in-one business operating system for growing African businesses.
            </p>
            <div className="flex gap-3">
              {[Linkedin, Twitter, Youtube, Facebook].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-[#4F46E5] hover:border-[#4F46E5] transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] !text-white/30 mb-6">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-white/50 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] !text-white/30 mb-6">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-white/50 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] !text-white/30 mb-6">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-white/50 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10 text-xs text-white/30">
          <p className="!text-white/30">© 2026 LeadsMind (Pty) Ltd. Reg. 2026/345498/07</p>
          <p className="!text-white/30">Made with ❤️ in South Africa 🇿🇦</p>
        </div>
      </div>
    </footer>
  );
}
