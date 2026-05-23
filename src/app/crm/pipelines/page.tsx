import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getCRMPipelines } from '@/app/actions/crm-workspace';
import { OpportunityPipeline } from '@/components/crm/OpportunityPipeline';
import { Kanban, LayoutDashboard, Plus } from 'lucide-react';
import Link from 'next/link';

export default async function PipelineDashboardPage() {
  const { success, data, error } = await getCRMPipelines();

  if (!success || !data) {
    return (
      <Wrapper>
        <div className="p-12 text-center text-white">Error loading Pipelines.</div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="p-6 max-w-[1600px] mx-auto font-body min-h-[calc(100vh-80px)] space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/crm" className="inline-flex items-center gap-2 text-sm font-bold text-t3 hover:text-white transition-colors mb-4">
              <LayoutDashboard size={16} /> Back to CRM Workspace
            </Link>
            <h1 className="text-3xl font-space font-black text-white mb-2 flex items-center gap-3">
              <Kanban className="text-accent" size={32} /> Opportunity Pipeline
            </h1>
            <p className="text-t3">Drag and drop opportunities through your revenue stages.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
              Filter Pipeline
            </button>
            <button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2">
              <Plus size={14} /> New Opportunity
            </button>
          </div>
        </div>

        {/* Pipeline Board */}
        <OpportunityPipeline opportunities={data} />
        
      </div>
    </Wrapper>
  );
}
