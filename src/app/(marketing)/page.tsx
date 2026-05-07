import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LandingContent from './LandingContent';

export default async function MarketingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return <LandingContent />;
}
