'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Linkedin, Twitter, Youtube, Facebook } from 'lucide-react';
import { footerLinks } from './data';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#E2E8F0]">
      <div className="grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-12 max-w-[1100px] mx-auto px-6 pt-16 pb-12">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center mb-4 group w-fit">
            <Image
              src="/assets/images/brand/LeadsMind_Logo.png.png"
              alt="LeadsMind"
              width={140}
              height={36}
              className="object-contain group-hover:scale-105 transition-transform"
            />
          </Link>
          <p className="text-sm !text-[#64748B] leading-[1.7] max-w-[240px] mt-3">
            The all-in-one business operating system for growing African businesses.
          </p>
          <div className="flex gap-2 mt-5">
            {[Linkedin, Twitter, Youtube, Facebook].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-[10px] bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center !text-[#64748B] hover:bg-[#4F46E5] hover:border-[#4F46E5] hover:!text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all duration-200"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.1em] !text-[#0F172A] mb-4">Product</h4>
          <ul>
            {footerLinks.product.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="block py-[5px] text-sm leading-none !text-[#64748B] hover:!text-[#4F46E5] transition-colors duration-150">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.1em] !text-[#0F172A] mb-4">Company</h4>
          <ul>
            {footerLinks.company.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="block py-[5px] text-sm leading-none !text-[#64748B] hover:!text-[#4F46E5] transition-colors duration-150">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-2 md:col-span-1">
          <h4 className="text-xs font-bold uppercase tracking-[0.1em] !text-[#0F172A] mb-4">Support</h4>
          <ul>
            {footerLinks.support.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="block py-[5px] text-sm leading-none !text-[#64748B] hover:!text-[#4F46E5] transition-colors duration-150">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-[1100px] mx-auto px-6 py-6 border-t border-[#F1F5F9]">
        <p className="text-[13px] !text-[#94A3B8]">© 2026 LeadsMind (Pty) Ltd. Reg. 2026/345498/07</p>
        <p className="text-[13px] !text-[#94A3B8]">
          Made with <span className="!text-[#EF4444]">❤️</span> in South Africa 🇿🇦
        </p>
      </div>
    </footer>
  );
}
