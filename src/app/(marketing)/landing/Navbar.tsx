'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrolled } from './hooks';
import { navLinks } from './data';

const Brand = () => (
  <Link href="/" className="flex items-center gap-2.5 group">
    <span className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,#4F46E5_0%,#7C3AED_50%,#0891B2_100%)] flex items-center justify-center shadow-lg shadow-[#4F46E5]/30 group-hover:scale-105 transition-transform">
      <Zap className="w-5 h-5 text-white fill-white" />
    </span>
    <span className="text-lg font-bold tracking-tight text-white">LeadsMind</span>
  </Link>
);

export default function Navbar({ user }: { user?: any }) {
  const scrolled = useScrolled(24);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className={`fixed top-0 w-full z-[60] transition-all duration-300 ${
        scrolled
          ? 'bg-[#0F172A]/90 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="container mx-auto px-6 h-[72px] flex items-center justify-between">
        <Brand />

        <div className="hidden lg:flex items-center gap-9 text-sm font-medium text-white/70">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="relative group py-2">
              <span className="group-hover:text-white transition-colors">{link.label}</span>
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
            <>
              <Link href="/auth/signin-basic">
                <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/5 text-sm font-medium rounded-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup-basic">
                <Button className="lm-shimmer bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white rounded-full px-6 h-10 text-sm font-semibold shadow-lg shadow-[#4F46E5]/25">
                  Start Free Trial
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          aria-label="Toggle menu"
          className="lg:hidden text-white p-2"
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
            className="lg:hidden overflow-hidden bg-[#0F172A]/98 backdrop-blur-xl border-b border-white/10"
          >
            <div className="container mx-auto px-6 py-6 flex flex-col gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-white/80 hover:text-white font-medium text-base"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
                {user ? (
                  <Link href="/dashboard">
                    <Button className="w-full bg-[#4F46E5] text-white rounded-full h-11">Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/signin-basic">
                      <Button variant="ghost" className="w-full text-white border border-white/15 rounded-full h-11">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/signup-basic">
                      <Button className="w-full bg-[#4F46E5] text-white rounded-full h-11">Start Free Trial</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
