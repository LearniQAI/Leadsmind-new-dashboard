import { createServerClient } from '@/lib/supabase/server';
import LandingContent from './LandingContent';

export default async function MarketingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <LandingContent user={user} />;
}
