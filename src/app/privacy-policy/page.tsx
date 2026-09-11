import type { Metadata } from 'next'
import PrivacyPolicyContent from './_components/PrivacyPolicyContent'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How LeadsMind collects, uses, and protects your data across the CRM, LMS, invoicing, HR, and automation platform.',
  alternates: { canonical: '/privacy-policy' },
  robots: { index: true, follow: true },
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />
}
