'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import '../../(marketing)/landing/landing.css';
import Navbar from '../../(marketing)/landing/Navbar';
import Footer from '../../(marketing)/landing/Footer';

const ROYAL = '#1359FF';

const sections = [
  {
    id: 'acceptance-of-terms',
    title: '1. Acceptance of Terms',
    content: `By accessing and using LeadsMind ("the Platform"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. These terms apply to all users, administrators, and anyone who accesses or uses the LeadsMind platform.`,
  },
  {
    id: 'description-of-service',
    title: '2. Description of Service',
    content: `LeadsMind is a business operating system that provides CRM, unified inbox, email marketing, invoicing, course management, reputation management, and AI-powered business tools. We reserve the right to modify, suspend, or discontinue any aspect of the service at any time.`,
  },
  {
    id: 'account-registration',
    title: '3. Account Registration',
    content: `To use LeadsMind, you must create an account and provide accurate, complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.`,
  },
  {
    id: 'acceptable-use',
    title: '4. Acceptable Use',
    content: `You agree not to use LeadsMind to send spam or unsolicited communications; violate any applicable laws or regulations; infringe on intellectual property rights; transmit harmful, offensive, or illegal content; attempt to gain unauthorized access to our systems; or use the platform in any way that could damage, disable, or impair our services.`,
  },
  {
    id: 'meta-platform-integration',
    title: '5. Meta Platform Integration',
    content: `When using LeadsMind's Meta integrations (Facebook, Instagram, WhatsApp), you agree to comply with Meta's Terms of Service and Platform Policies in addition to these terms. You are responsible for ensuring your use of Meta platform data through LeadsMind complies with all applicable Meta policies and guidelines.`,
  },
  {
    id: 'payment-and-billing',
    title: '6. Payment and Billing',
    content: `LeadsMind operates on a subscription basis. By subscribing, you authorize us to charge your payment method on a recurring basis. All fees are non-refundable unless otherwise stated. We reserve the right to change our pricing with 30 days notice. Failure to pay may result in suspension or termination of your account.`,
  },
  {
    id: 'data-ownership',
    title: '7. Data Ownership',
    content: `You retain ownership of all data you input into LeadsMind, including contacts, messages, invoices, and course content. By using our platform, you grant us a limited license to store and process your data solely to provide our services. We do not claim ownership of your data.`,
  },
  {
    id: 'intellectual-property',
    title: '8. Intellectual Property',
    content: `The LeadsMind platform, including its design, features, and underlying technology, is owned by LeadsMind and protected by intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of our platform without our explicit written permission.`,
  },
  {
    id: 'limitation-of-liability',
    title: '9. Limitation of Liability',
    content: `LeadsMind shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability to you for any claims arising from these terms or your use of the platform shall not exceed the amount you paid us in the 12 months preceding the claim.`,
  },
  {
    id: 'termination',
    title: '10. Termination',
    content: `We reserve the right to suspend or terminate your account at any time for violation of these terms. You may terminate your account at any time by contacting support@leadsmind.io. Upon termination, your right to use the platform ceases immediately. We may retain certain data as required by law.`,
  },
  {
    id: 'governing-law',
    title: '11. Governing Law',
    content: `These Terms of Service shall be governed by and construed in accordance with the laws of South Africa. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the South African courts.`,
  },
  {
    id: 'contact',
    title: '12. Contact',
    content: `For questions about these Terms of Service, contact us at:\n\nLeadsMind\nEmail: legal@leadsmind.io\nWebsite: https://leadsmind.io`,
  },
];

export default function TermsContent() {
  const [activeId, setActiveId] = useState(sections[0].id);

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      {/* Header */}
      <div
        className="border-b border-[#E2E8F0]"
        style={{ background: `linear-gradient(180deg, #FFFFFF 0%, ${ROYAL}0d 100%)` }}
      >
        <div className="max-w-[1100px] mx-auto px-6 pt-16 pb-12 md:pt-20 md:pb-14">
          <p className="text-xs font-semibold tracking-[0.06em] !text-[#64748B] mb-3">
            Last updated: June 2026
          </p>
          <h1 className="font-space text-[32px] md:text-[44px] font-bold !text-[#0F172A] mb-3 leading-tight">
            Terms of Service
          </h1>
          <p className="text-[15px] md:text-base !text-[#64748B]">
            LeadsMind Operating System — leadsmind.io
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-[1100px] mx-auto px-6 py-12 md:py-16 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10 md:gap-16">
        {/* Table of contents */}
        <nav
          aria-label="Table of contents"
          className="hidden md:block sticky top-24 self-start"
        >
          <p className="text-xs font-bold uppercase tracking-[0.08em] !text-[#94A3B8] mb-4">
            On this page
          </p>
          <ul className="space-y-1 border-l border-[#E2E8F0]">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={() => setActiveId(section.id)}
                  className="block pl-4 -ml-px py-1.5 text-sm border-l-2 transition-colors"
                  style={
                    activeId === section.id
                      ? { borderColor: ROYAL, color: ROYAL, fontWeight: 600 }
                      : { borderColor: 'transparent', color: '#64748B' }
                  }
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile TOC */}
        <details className="md:hidden rounded-2xl border border-[#E2E8F0] bg-[#F8F9FC] px-4 py-3 open:pb-4">
          <summary className="text-sm font-semibold !text-[#0F172A] cursor-pointer select-none">
            Jump to a section
          </summary>
          <ul className="mt-3 space-y-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-sm !text-[#1359FF]">
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </details>

        {/* Content */}
        <div className="max-w-[680px]">
          {sections.map((section, i) => (
            <div
              key={section.id}
              id={section.id}
              className={i > 0 ? 'mt-10 pt-10 border-t border-[#F1F5F9]' : ''}
              style={{ scrollMarginTop: '96px' }}
            >
              <h2 className="font-space text-lg md:text-xl font-bold !text-[#0F172A] mb-3">
                {section.title}
              </h2>
              <p className="text-[15px] !text-[#475569] leading-[1.8] whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}

          <div className="mt-12 pt-8 border-t border-[#E2E8F0] flex items-center justify-between flex-wrap gap-3">
            <span className="text-[13px] !text-[#94A3B8]">
              © 2026 LeadsMind. All rights reserved.
            </span>
            <Link href="/privacy-policy" className="text-sm font-medium" style={{ color: ROYAL }}>
              ← Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
