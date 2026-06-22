import { getAuthenticatedAffiliate } from '@/app/actions/affiliates';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AffiliatePortalClient from './AffiliatePortalClient';

export const dynamic = 'force-dynamic';

export default async function AffiliateDashboardPage() {
  const affiliate = await getAuthenticatedAffiliate();
  if (!affiliate) {
    redirect('/affiliate-portal/login');
  }

  const supabase = await createServerClient();
  const [clicksRes, commissionsRes, payoutsRes, leaderboardRes, referralsRes] = await Promise.all([
    supabase
      .from('affiliate_clicks')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('affiliate_commissions')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false }),
    // Fetch all commissions in this programme to build a leaderboard
    supabase
      .from('affiliate_commissions')
      .select('amount, affiliate:affiliates(full_name)')
      .eq('programme_id', affiliate.programme_id)
      .in('status', ['approved', 'paid']),
    // Fetch referred contacts
    supabase
      .from('contacts')
      .select('id, first_name, last_name, email, created_at')
      .eq('referred_by_affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
  ]);

  const clicks = clicksRes.data || [];
  const commissions = commissionsRes.data || [];
  const payouts = payoutsRes.data || [];
  const rawLeaderboard = leaderboardRes.data || [];
  const referrals = referralsRes.data || [];

  // Group and sum leaderboard earnings
  const earningsMap: Record<string, number> = {};
  for (const item of rawLeaderboard) {
    const name = (item.affiliate as any)?.full_name || 'Anonymous Partner';
    earningsMap[name] = (earningsMap[name] || 0) + Number(item.amount);
  }

  const leaderboard = Object.entries(earningsMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <AffiliatePortalClient
      affiliate={affiliate}
      clicks={clicks}
      commissions={commissions}
      payouts={payouts}
      leaderboard={leaderboard}
      referrals={referrals}
    />
  );
}
