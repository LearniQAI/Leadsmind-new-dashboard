'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Plus, Layers } from 'lucide-react';
import { Pipeline, PipelineStage, Opportunity } from '@/types/crm';
import { PipelineStats } from './components/PipelineStats';
import { KanbanColumn } from './components/KanbanColumn';
import { OpportunityModal } from './components/OpportunityModal';
import { StageSettingsModal } from './components/StageSettingsModal';
import { updateDealStage } from '@/app/actions/pipelines';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Contact } from '@/types/crm';
import { CreatePipelineModal } from './components/CreatePipelineModal';

interface PipelinesClientProps {
  pipelines: Pipeline[];
  activePipeline: Pipeline;
  initialStages: PipelineStage[];
  initialOpportunities: Opportunity[];
  contacts: Contact[];
  members: { id: string, name: string }[];
}

export default function PipelinesClient({
  pipelines,
  activePipeline,
  initialStages,
  initialOpportunities,
  contacts,
  members
}: PipelinesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isOppModalOpen, setIsOppModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [targetStageId, setTargetStageId] = useState<string | null>(null);

  // Board's own source of truth for opportunities, seeded from the server
  // props. The PRIMARY root cause of "deal added but invisible" was actually
  // upstream of this component entirely: `getPipelineOpportunities`'s embed
  // query (`contact:contacts(*)`) was ambiguous — `opportunities` has three
  // FKs into `contacts` — and PostgREST rejected it outright (PGRST201) on
  // every single call, meaning `initialOpportunities` was `[]` from the very
  // first server render for every workspace, always, not just after a
  // create. Fixed at the query itself (see `pipelines.ts`). Independently of
  // that, this component ALSO had no direct update path for create/edit/
  // delete — only drag-and-drop ever updated local state; a freshly created
  // deal's visibility depended entirely on `OpportunityModal`'s
  // `router.refresh()` eventually cascading a new `initialOpportunities`
  // prop back down through a re-render, an indirect mechanism with no direct
  // code path connecting "deal created" to "board shows it". Both are fixed
  // now: the query returns real data, and the create/update/delete flow
  // (`OpportunityModal`'s `onSaved`) gives this state a direct, synchronous
  // update the instant the server action resolves, rather than relying
  // solely on the refresh cascade.
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);

  // Defense in depth: if the server-provided list changes for any other
  // reason (e.g. a real page navigation, or router.refresh() from elsewhere),
  // resync — but this is no longer the only way the board learns about a
  // deal, just a consistency backstop.
  useEffect(() => {
    setOpportunities(initialOpportunities);
  }, [initialOpportunities]);

  const handleEditDeal = (opp: Opportunity) => {
    setSelectedOpp(opp);
    setIsOppModalOpen(true);
  };

  const handleCreateDeal = (stageId?: string) => {
    setSelectedOpp(null);
    setTargetStageId(stageId || (initialStages.length > 0 ? initialStages[0].id : null));
    setIsOppModalOpen(true);
  };

  // Called directly by OpportunityModal the moment createOpportunity/
  // updateOpportunity/deleteOpportunity resolves successfully — this is the
  // one direct, deterministic link from "server write succeeded" to "board
  // shows it", replacing the previous implicit refresh-cascade.
  const handleDealSaved = (opp: Opportunity, action: 'create' | 'update' | 'delete') => {
    setOpportunities(prev => {
      if (action === 'delete') return prev.filter(o => o.id !== opp.id);
      const exists = prev.some(o => o.id === opp.id);
      return exists ? prev.map(o => (o.id === opp.id ? opp : o)) : [...prev, opp];
    });
    router.refresh();
  };

  // 2. Drag End Handler — same direct-state-update approach as above rather
  // than useOptimistic, so both mutation paths on this board go through one
  // consistent mechanism instead of two different ones.
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const dealId = draggableId;
    const newStageId = destination.droppableId;
    const newPosition = destination.index;
    const previous = opportunities;

    setOpportunities(prev =>
      prev.map(opp =>
        opp.id === dealId
          ? { ...opp, stage_id: newStageId, position: newPosition, updated_at: new Date().toISOString() }
          : opp
      )
    );

    startTransition(async () => {
      const res = await updateDealStage(dealId, newStageId, newPosition);
      if (!res.success) {
        toast.error('Tactical failure: Could not update deal stage');
        setOpportunities(previous);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* 1. Header Area */}
      <div className="shrink-0 flex flex-col">
        <div className="h-[72px] px-8 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-[0_1px_2px_rgba(15,23,42,0.04)] border-b border-dash-border/70">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-[10px] font-bold !text-dash-accent uppercase tracking-wide leading-none mb-2">
                Pipelines
              </h1>
              <div className="flex items-center gap-2">
                <select
                  value={activePipeline.id}
                  onChange={(e) => router.push(`/pipelines?pipelineId=${e.target.value}`)}
                  className="bg-transparent text-[24px] font-extrabold font-display !text-dash-text tracking-tight leading-none focus:outline-none cursor-pointer hover:text-dash-accent transition-colors appearance-none min-w-[140px]"
                >
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse"></div>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-dash-border/60"></div>

            <button 
              onClick={() => setIsPipelineModalOpen(true)}
              className="group flex items-center gap-2 h-10 px-4 rounded-[12px] bg-dash-surface border border-dash-border !text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/5 transition-colors motion-reduce:transition-none"
              title="Add New Pipeline"
            >
              <Plus size={12} className="group-hover:scale-110 transition-transform motion-reduce:group-hover:scale-100" />
              <span className="text-[11px] font-bold tracking-wider">New pipeline</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsStageModalOpen(true)}
              className="h-11 px-6 rounded-[12px] bg-dash-surface border border-dash-border !text-dash-text hover:bg-dash-border/60 text-[12px] font-bold transition-all flex items-center gap-2.5 active:scale-[0.98]"
            >
              <Layers size={12} className="!text-dash-textMuted" />
              Architect stages
            </button>
            <button
              onClick={() => handleCreateDeal()}
              className="h-11 px-6 rounded-[12px] bg-dash-accent text-white hover:bg-dash-accent/90 text-[12px] font-bold transition-all flex items-center gap-2.5 shadow-xl shadow-dash-accent/20 active:scale-[0.98]"
            >
              <Plus size={12} />
              Launch deal
            </button>
          </div>
        </div>

        <PipelineStats opportunities={opportunities} members={members} />
      </div>

      {/* 2. Compact Board Area — narrow fixed-width columns so a typical
          5-7 stage pipeline fits a standard desktop width without scrolling;
          horizontal scroll is a deliberate fallback for unusually long
          pipelines, not the default experience. */}
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-x-auto light-scrollbar bg-dash-surface p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex items-start gap-4 min-h-full">
            {initialStages.map((stage, idx) => (
              <div key={stage.id} className="w-[260px] shrink-0">
                <KanbanColumn
                  stage={stage}
                  stageIndex={idx}
                  stageCount={initialStages.length}
                  opportunities={opportunities.filter(opp => opp.stage_id === stage.id)}
                  onEditDeal={handleEditDeal}
                  onAddDeal={() => handleCreateDeal(stage.id)}
                  showEmptyStateAction={opportunities.length === 0}
                />
              </div>
            ))}

            {/* Add Stage Placeholder */}
            <div
              onClick={() => setIsStageModalOpen(true)}
              className="w-[260px] shrink-0 h-[240px] flex flex-col items-center justify-center border-2 border-dashed border-dash-border rounded-2xl group hover:border-dash-accent/30 transition-all motion-reduce:transition-none cursor-pointer bg-white hover:bg-dash-accent/5"
            >
              <div className="w-11 h-11 rounded-2xl bg-white border border-dash-border flex items-center justify-center mb-3 group-hover:bg-dash-accent/10 group-hover:border-dash-accent/20 group-hover:scale-110 transition-all motion-reduce:group-hover:scale-100 shadow-inner">
                <Plus size={18} className="!text-dash-textMuted group-hover:text-dash-accent" />
              </div>
              <p className="text-[11px] font-bold !text-dash-textMuted tracking-wider group-hover:!text-dash-text transition-colors text-center px-4">Add pipeline stage</p>
            </div>
          </div>
        </DragDropContext>
        </div>
        {/* Fade hint — signals more stages exist off-screen instead of an
            abrupt hard cut when the board overflows horizontally. Only the
            columns themselves scroll (see overflow-x-auto above); this sits
            on top as a purely visual cue. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-dash-surface to-transparent" />
      </div>

      {/* 3. Modals */}
      <OpportunityModal
        isOpen={isOppModalOpen}
        onClose={() => setIsOppModalOpen(false)}
        opportunity={selectedOpp}
        stageId={targetStageId || undefined}
        contacts={contacts}
        stages={initialStages}
        onSaved={handleDealSaved}
      />

      <StageSettingsModal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        pipelineId={activePipeline.id}
        initialStages={initialStages}
      />

      <CreatePipelineModal 
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
      />
    </div>
  );
}
