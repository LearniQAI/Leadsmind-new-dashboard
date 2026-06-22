import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import AffiliatesClient from './AffiliatesClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AffiliatesPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/login');

  const supabase = await createServerClient();
  const [programmesRes, affiliatesRes, commissionsRes, workspaceRes, payoutsRes] = await Promise.all([
    supabase
      .from('affiliate_programmes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('affiliates')
      .select('*, programme:affiliate_programmes(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('affiliate_commissions')
      .select('*, affiliate:affiliates(full_name, email)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('workspaces')
      .select('slug')
      .eq('id', workspaceId)
      .maybeSingle(),
    supabase
      .from('affiliate_payouts')
      .select('*, affiliate:affiliates(full_name, email, payout_details)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
  ]);

  const programmes = programmesRes.data || [];
  const affiliates = affiliatesRes.data || [];
  const commissions = commissionsRes.data || [];
  const workspaceSlug = workspaceRes.data?.slug || '';
  const payouts = payoutsRes.data || [];

  return (
    <MetaData pageTitle="Affiliate Marketing Management">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[#04091a]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-[#04091a] border-b border-white/5 shrink-0">
            <div>
              <h1 className="text-[20px] font-bold text-[#eef2ff] uppercase tracking-tight leading-none mb-1 font-space-grotesk">
                Affiliate <span className="text-[#3b82f6]">Marketing</span>
              </h1>
              <p className="text-[10.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] font-dm-sans">
                Manage your affiliate network, commissions queue, and payouts in ZAR
              </p>
            </div>
          </div>

          <div className="flex-1 p-6">
            <AffiliatesClient
              initialProgrammes={programmes}
              initialAffiliates={affiliates}
              initialCommissions={commissions}
              initialPayouts={payouts}
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
            />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
