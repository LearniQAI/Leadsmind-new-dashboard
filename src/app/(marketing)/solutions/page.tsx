import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import SolutionsIndexContent from './_components/SolutionsIndexContent';

export const metadata: Metadata = {
  title: 'All Modules',
  description:
    'CRM, LMS, accounting, automation, HR, calendar, communication, and content — explore every module in the LeadsMind all-in-one business platform.',
  alternates: { canonical: '/solutions' },
};

export default async function SolutionsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SolutionsIndexContent user={user} />;
}
