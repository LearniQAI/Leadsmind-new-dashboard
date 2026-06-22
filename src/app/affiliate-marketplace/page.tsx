import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import MarketplaceClient from './MarketplaceClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AffiliateMarketplacePage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/login');

  const supabase = await createServerClient();
  const { data: programmes } = await supabase
    .from('affiliate_programmes')
    .select('*')
    .eq('listed_in_marketplace', true)
    .order('created_at', { ascending: false });

  return (
    <MetaData pageTitle="Affiliate Program Marketplace">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[#04091a]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-6 bg-[#04091a] border-b border-white/5 shrink-0">
            <div>
              <h1 className="text-[20px] font-bold text-[#eef2ff] uppercase tracking-tight leading-none mb-1 font-space-grotesk">
                Affiliate <span className="text-[#3b82f6]">Marketplace</span>
              </h1>
              <p className="text-[10.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] font-dm-sans">
                Discover high-converting public affiliate programs to join and promote
              </p>
            </div>
          </div>

          <div className="flex-1 p-6">
            <MarketplaceClient initialProgrammes={programmes || []} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
