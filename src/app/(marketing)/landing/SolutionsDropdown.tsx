'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { modules } from '@/data/modules';

const CLOSE_DELAY_MS = 220;

export default function SolutionsDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearCloseTimeout() {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  }

  function openNow() {
    clearCloseTimeout();
    setOpen(true);
  }

  function closeWithDelay() {
    clearCloseTimeout();
    closeTimeout.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimeout(), []);

  return (
    <div ref={containerRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeWithDelay}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openNow())}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative group flex items-center gap-1 py-2"
      >
        <span className="group-hover:text-[#0F172A] transition-colors">Solutions</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180 text-[#0F172A]' : ''}`}
        />
        <span className="absolute left-0 -bottom-0.5 h-[2px] w-0 bg-[#4F46E5] rounded-full group-hover:w-full transition-all duration-300" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, x: '-50%', y: -10, scale: 0.98 }}
            animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
            exit={{ opacity: 0, x: '-50%', y: -10, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-[80px] w-[720px] max-w-[92vw] z-[70]"
          >
            <div className="relative rounded-3xl border border-gray-100 bg-white shadow-[0_24px_60px_rgba(10,15,61,0.12)] p-6 overflow-hidden">
              {/* connector indicator back to the trigger */}
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-gray-100 rotate-45 rounded-tl-[3px]" />

              <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                {modules.filter((m) => m.primary).map((m) => {
                  const Icon = m.icon;
                  return (
                    <Link
                      key={m.slug}
                      href={`/solutions/${m.slug}`}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="flex min-w-0 items-start gap-2.5 px-2 py-2 -mx-2 rounded-xl transition-colors hover:bg-gray-50 outline-none focus-visible:bg-gray-50"
                    >
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
                        style={{ backgroundColor: m.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#0F172A]">{m.label}</span>
                        <span className="block text-xs text-gray-500 leading-snug mt-0.5 line-clamp-2">
                          {m.shortDescription}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 mt-2 pt-4">
                <Link
                  href="/solutions"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1 text-sm font-medium text-[#1359FF] hover:gap-2 transition-all outline-none focus-visible:underline"
                >
                  View all modules
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
