import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import AboutContent from './_components/AboutContent';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    "LeadsMind is Africa's first Business Operating System — CRM, accounting, LMS, marketing, automation, and AI in one login, billed in your local currency. Learn our story.",
  alternates: { canonical: '/about' },
};

export default async function AboutPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AboutContent user={user} />;
}
