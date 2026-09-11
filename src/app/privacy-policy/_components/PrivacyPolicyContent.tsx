'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import '../../(marketing)/landing/landing.css';
import Navbar from '../../(marketing)/landing/Navbar';
import Footer from '../../(marketing)/landing/Footer';

const ROYAL = '#1359FF';

const sections = [
  {
    id: 'introduction',
    title: '1. Introduction',
    content: `LeadsMind ("we", "our", "us") operates the LeadsMind Operating System platform available at leadsmind.io. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our platform. By using LeadsMind, you agree to the collection and use of information in accordance with this policy.`,
  },
  {
    id: 'information-we-collect',
    title: '2. Information We Collect',
    content: `We collect information you provide directly to us, including your name, email address, phone number, business name, and payment information when you register for an account. We also collect information about how you use our platform, including log data, device information, and usage patterns. When you connect third-party services such as Facebook, Instagram, WhatsApp, or payment gateways, we collect the necessary credentials and account information to facilitate those connections.`,
  },
  {
    id: 'how-we-use-your-information',
    title: '3. How We Use Your Information',
    content: `We use the information we collect to provide, maintain, and improve our services; process transactions and send related information; send technical notices, updates, and support messages; respond to your comments and questions; and monitor and analyze usage patterns to improve user experience. We do not sell your personal information to third parties.`,
  },
  {
    id: 'meta-platform-data',
    title: '4. Meta Platform Data',
    content: `When you connect your Facebook Page, Instagram Business account, or WhatsApp Business line to LeadsMind, we access and store messages, page information, and account details as authorized by you through Meta's OAuth flow. This data is used solely to display and manage your conversations within the LeadsMind Unified Inbox. We comply with Meta's Platform Terms and Developer Policies. We do not use Meta platform data for advertising purposes or share it with unauthorized third parties.`,
  },
  {
    id: 'data-storage-and-security',
    title: '5. Data Storage and Security',
    content: `Your data is stored securely using Supabase infrastructure with row-level security policies. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Access tokens for connected platforms are encrypted at rest. We retain your data for as long as your account is active or as needed to provide you with our services.`,
  },
  {
    id: 'third-party-services',
    title: '6. Third-Party Services',
    content: `LeadsMind integrates with various third-party services including Meta (Facebook, Instagram, WhatsApp), payment gateways, and other business tools. When you connect these services, their respective privacy policies also apply. We are not responsible for the privacy practices of third-party services.`,
  },
  {
    id: 'data-deletion',
    title: '7. Data Deletion',
    content: `You may request deletion of your personal data at any time by contacting us at support@leadsmind.io. When you disconnect a third-party platform connection, we delete the associated access tokens from our systems. To delete your entire account and all associated data, contact our support team.`,
  },
  {
    id: 'popia-compliance-south-africa',
    title: '8. POPIA Compliance (South Africa)',
    content: `LeadsMind complies with the Protection of Personal Information Act (POPIA) of South Africa. As a responsible party, we process personal information lawfully, minimally, and for specific purposes. You have the right to access, correct, and delete your personal information. To exercise these rights, contact our Information Officer at privacy@leadsmind.io.`,
  },
  {
    id: 'cookies',
    title: '9. Cookies',
    content: `We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, some portions of our service may not function properly.`,
  },
  {
    id: 'changes-to-this-policy',
    title: '10. Changes to This Policy',
    content: `We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.`,
  },
  {
    id: 'contact-us',
    title: '11. Contact Us',
    content: `If you have any questions about this Privacy Policy, please contact us at:\n\nLeadsMind\nEmail: privacy@leadsmind.io\nWebsite: https://leadsmind.io`,
  },
];

export default function PrivacyPolicyContent() {
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
            Privacy Policy
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
            <Link href="/terms" className="text-sm font-medium" style={{ color: ROYAL }}>
              Terms of Service →
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
