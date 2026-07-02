import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import ShipmentsClient from './ShipmentsClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ShipmentsPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const supabase = await createServerClient();
  const [shipmentsRes, brandRes] = await Promise.all([
    supabase
      .from('courier_shipments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('courier_brand_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle()
  ]);

  const shipments = shipmentsRes.data || [];
  const brandSettings = brandRes.data || null;

  return (
    <MetaData pageTitle="Courier Tracking & Shipments">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[#04091a]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-[#04091a] border-b border-white/5 shrink-0">
            <div>
              <h1 className="text-[20px] font-bold text-[#eef2ff] uppercase tracking-tight leading-none mb-1 font-space-grotesk">
                Shipment <span className="text-[#3b82f6]">Tracking</span>
              </h1>
              <p className="text-[10.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] font-dm-sans">
                Monitor and manage courier dispatches & branded tracking updates
              </p>
            </div>
          </div>

          <div className="flex-1 p-6">
            <ShipmentsClient initialShipments={shipments} brandSettings={brandSettings} workspaceId={workspaceId} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
