import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import CareersContent from './_components/CareersContent';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    "Join the team building Africa's first Business Operating System. Explore open roles across engineering, AI, product, sales, marketing, and more at LeadsMind.",
  alternates: { canonical: '/careers' },
};

export default async function CareersPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <CareersContent user={user} />;
}
