import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MarketingPage from './(marketing)/page';

export default async function IndexPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return <MarketingPage />;
}
