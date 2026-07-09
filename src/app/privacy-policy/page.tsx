import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How LeadsMind collects, uses, and protects your data across the CRM, LMS, invoicing, HR, and automation platform.',
  alternates: { canonical: '/privacy-policy' },
  robots: { index: true, follow: true },
}

export default function PrivacyPolicyPage() {
  return (
    <div style={{
      backgroundColor: '#04091a',
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      color: '#eef2ff',
    }}>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '20px',
          fontWeight: 700,
          color: '#eef2ff',
        }}>
          LEADS<span style={{ color: '#3b82f6' }}>MIND</span>
        </span>
        <Link href="/" style={{
          color: '#94a3c8',
          fontSize: '13px',
          textDecoration: 'none',
        }}>
          ← Back to LeadsMind
        </Link>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: '60px 40px',
      }}>
        <p style={{ color: '#4a5a82', fontSize: '12px', marginBottom: '8px' }}>
          Last updated: June 2026
        </p>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '36px',
          fontWeight: 700,
          marginBottom: '8px',
          color: '#eef2ff',
        }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#94a3c8', fontSize: '15px', marginBottom: '48px' }}>
          LeadsMind Operating System — leadsmind.io
        </p>

        {/* Helper component for sections */}
        {[
          {
            title: '1. Introduction',
            content: `LeadsMind ("we", "our", "us") operates the LeadsMind Operating System platform available at leadsmind.io. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our platform. By using LeadsMind, you agree to the collection and use of information in accordance with this policy.`
          },
          {
            title: '2. Information We Collect',
            content: `We collect information you provide directly to us, including your name, email address, phone number, business name, and payment information when you register for an account. We also collect information about how you use our platform, including log data, device information, and usage patterns. When you connect third-party services such as Facebook, Instagram, WhatsApp, or payment gateways, we collect the necessary credentials and account information to facilitate those connections.`
          },
          {
            title: '3. How We Use Your Information',
            content: `We use the information we collect to provide, maintain, and improve our services; process transactions and send related information; send technical notices, updates, and support messages; respond to your comments and questions; and monitor and analyze usage patterns to improve user experience. We do not sell your personal information to third parties.`
          },
          {
            title: '4. Meta Platform Data',
            content: `When you connect your Facebook Page, Instagram Business account, or WhatsApp Business line to LeadsMind, we access and store messages, page information, and account details as authorized by you through Meta's OAuth flow. This data is used solely to display and manage your conversations within the LeadsMind Unified Inbox. We comply with Meta's Platform Terms and Developer Policies. We do not use Meta platform data for advertising purposes or share it with unauthorized third parties.`
          },
          {
            title: '5. Data Storage and Security',
            content: `Your data is stored securely using Supabase infrastructure with row-level security policies. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Access tokens for connected platforms are encrypted at rest. We retain your data for as long as your account is active or as needed to provide you with our services.`
          },
          {
            title: '6. Third-Party Services',
            content: `LeadsMind integrates with various third-party services including Meta (Facebook, Instagram, WhatsApp), payment gateways, and other business tools. When you connect these services, their respective privacy policies also apply. We are not responsible for the privacy practices of third-party services.`
          },
          {
            title: '7. Data Deletion',
            content: `You may request deletion of your personal data at any time by contacting us at support@leadsmind.io. When you disconnect a third-party platform connection, we delete the associated access tokens from our systems. To delete your entire account and all associated data, contact our support team.`
          },
          {
            title: '8. POPIA Compliance (South Africa)',
            content: `LeadsMind complies with the Protection of Personal Information Act (POPIA) of South Africa. As a responsible party, we process personal information lawfully, minimally, and for specific purposes. You have the right to access, correct, and delete your personal information. To exercise these rights, contact our Information Officer at privacy@leadsmind.io.`
          },
          {
            title: '9. Cookies',
            content: `We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, some portions of our service may not function properly.`
          },
          {
            title: '10. Changes to This Policy',
            content: `We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.`
          },
          {
            title: '11. Contact Us',
            content: `If you have any questions about this Privacy Policy, please contact us at:\n\nLeadsMind\nEmail: privacy@leadsmind.io\nWebsite: https://leadsmind.io`
          },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: '40px' }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '18px',
              fontWeight: 600,
              color: '#eef2ff',
              marginBottom: '12px',
            }}>
              {section.title}
            </h2>
            <p style={{
              color: '#94a3c8',
              fontSize: '14px',
              lineHeight: '1.8',
              whiteSpace: 'pre-line',
            }}>
              {section.content}
            </p>
          </div>
        ))}

        {/* Footer */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '32px',
          marginTop: '48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ color: '#4a5a82', fontSize: '12px' }}>
            © 2026 LeadsMind. All rights reserved.
          </span>
          <Link href="/terms" style={{
            color: '#3b82f6',
            fontSize: '13px',
            textDecoration: 'none',
          }}>
            Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  )
}
