import type { Metadata } from 'next'
import TermsContent from './_components/TermsContent'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service governing use of the LeadsMind business operating system.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return <TermsContent />
}
