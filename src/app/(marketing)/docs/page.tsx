import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import DocsIndexContent from './_components/DocsIndexContent';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Plain-English guides for every part of LeadsMind — CRM, accounting, marketing, automation, courses, support, and security.',
  alternates: { canonical: '/docs' },
};

export default async function DocsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <DocsIndexContent user={user} />;
}
