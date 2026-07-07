'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrolled } from './hooks';
import { navLinks } from './data';

const Brand = () => (
  <Link href="/" className="flex items-center group">
    <Image
      src="/assets/images/brand/LeadsMind_Logo.png.png"
      alt="LeadsMind"
      width={140}
      height={36}
      priority
      className="object-contain group-hover:scale-105 transition-transform"
    />
  </Link>
);

export default function Navbar({ user }: { user?: any }) {
  const scrolled = useScrolled(24);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className={`fixed top-0 w-full z-[60] bg-white border-b border-slate-200/80 transition-shadow duration-300 ${
        scrolled ? 'shadow-sm shadow-slate-900/5' : 'shadow-none'
      }`}
    >
      <div className="container mx-auto px-6 h-[72px] flex items-center justify-between">
        <Brand />

        <div className="hidden lg:flex items-center gap-9 text-sm font-medium text-[#64748B]">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="relative group py-2">
              <span className="group-hover:text-[#0F172A] transition-colors">{link.label}</span>
              <span className="absolute left-0 -bottom-0.5 h-[2px] w-0 bg-[#4F46E5] rounded-full group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link href="/dashboard">
              <Button className="bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white rounded-full px-6 h-10 text-sm font-semibold shadow-lg shadow-[#4F46E5]/25">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/auth/signup-basic">
              <Button className="lm-shimmer bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white rounded-full px-6 h-10 text-sm font-semibold shadow-lg shadow-[#4F46E5]/25">
                Start Free Trial
              </Button>
            </Link>
          )}
        </div>

        <button
          aria-label="Toggle menu"
          className="lg:hidden text-[#0F172A] p-2"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="lg:hidden overflow-hidden bg-white border-b border-slate-200/80"
          >
            <div className="container mx-auto px-6 py-6 flex flex-col gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-[#64748B] hover:text-[#0F172A] font-medium text-base"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-200/80">
                {user ? (
                  <Link href="/dashboard">
                    <Button className="w-full bg-[#4F46E5] text-white rounded-full h-11">Dashboard</Button>
                  </Link>
                ) : (
                  <Link href="/auth/signup-basic">
                    <Button className="w-full bg-[#4F46E5] text-white rounded-full h-11">Start Free Trial</Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
