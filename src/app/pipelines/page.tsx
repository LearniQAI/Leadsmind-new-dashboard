import { requireAuth, getCurrentWorkspace } from '@/lib/auth';
import {
 getPipelines,
 getPipelineStages,
 getPipelineOpportunities
} from '@/app/actions/pipelines';
import { getInvoices } from '@/app/actions/finance';
import { KanbanBoard } from '@/components/crm/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Target } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import { PipelineSelector } from '@/components/crm/PipelineSelector';

export const dynamic = 'force-dynamic';

export default async function PipelinesPage({
 searchParams,
}: {
 searchParams: { pipelineId?: string };
}) {
 await requireAuth();
 const workspace = await getCurrentWorkspace();
 if (!workspace) redirect('/login');

 const pipelinesResult = await getPipelines();
 const pipelines = pipelinesResult.success ? pipelinesResult.data || [] : [];
 const pipelineError = !pipelinesResult.success ? pipelinesResult.error : undefined;

 if (pipelines.length === 0) {
  return (
   <MetaData pageTitle="Pipelines">
    <Wrapper>
     <div className="flex flex-col h-[calc(100vh-200px)] items-center justify-center text-center space-y-6">
      <div className="card__icon !w-24 !h-24 !text-4xl shadow-xl shadow-primary/5">
       <Target className="h-10 w-10" />
      </div>
      <div className="space-y-2">
       <h2 className="card__title !text-3xl uppercase tracking-tight">No pipelines yet</h2>
       <p className="card__sub-title !text-sm max-w-sm leading-relaxed">
        Create your first sales pipeline to start tracking deals and moving prospects through stages.
       </p>
      </div>
      <div className="flex items-center gap-3">
       <Link href="/apps/pipelines/new" className="btn btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-8 shadow-lg shadow-primary/20">
        <Plus className="h-4 w-4 mr-2" />
        Create Pipeline
       </Link>
      </div>
      <p className="card__desc !text-xs !mt-4 font-medium">
       {pipelineError ? `Error: ${pipelineError}` : 'Refresh the page if your pipeline just got set up.'}
      </p>
     </div>
    </Wrapper>
   </MetaData>
  );
 }

 const { pipelineId } = searchParams;
 const activePipelineId = pipelineId || pipelines[0].id;

 const [stagesResult, opportunitiesResult, invoices] = await Promise.all([
  getPipelineStages(activePipelineId),
  getPipelineOpportunities(activePipelineId),
  getInvoices(workspace.id)
 ]);

 const stages = stagesResult.success ? stagesResult.data || [] : [];
 const opportunities = opportunitiesResult.success ? (opportunitiesResult.data || []).map(opp => {
  // Attach invoice stats to opportunity contact
  const contactInvoices = invoices.filter(inv => inv.contact_id === opp.contact_id);
  const totalInvoiced = contactInvoices.reduce((sum, inv) => sum + (inv.status !== 'void' ? inv.total_amount : 0), 0);
  const paidAmount = contactInvoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.total_amount : 0), 0);

  return {
   ...opp,
   contact: opp.contact ? {
    ...opp.contact,
    total_invoiced: totalInvoiced,
    outstanding_balance: totalInvoiced - paidAmount
   } : undefined
  };
 }) : [];

 return (
  <MetaData pageTitle="Pipelines">
   <Wrapper>
    <div className="app__slide-wrapper">
     <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
       <div className="flex flex-wrap items-center gap-4">
        <div>
         <h1 className="card__title !text-4xl uppercase mb-1">Pipelines</h1>
         <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Track and manage your sales opportunities</p>
        </div>
        <PipelineSelector
         pipelines={pipelines}
         activePipelineId={activePipelineId}
        />
       </div>
       <div className="flex items-center gap-3">
        <Link href={`/apps/pipelines/${activePipelineId}/stages`} className="btn btn-outline-theme-border !rounded-xl text-[10px] uppercase font-black tracking-widest gap-2">
         <Settings className="h-4 w-4" />
         <span>Configure Stages</span>
        </Link>
       </div>
      </div>

      <KanbanBoard stages={stages} opportunities={opportunities} />
     </div>
    </div>
   </Wrapper>
  </MetaData>
 );
}
