'use client';

import React, { useState, useOptimistic, useTransition } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Pipeline, PipelineStage, Opportunity } from '@/types/crm';
import { PipelineStats } from './components/PipelineStats';
import { KanbanColumn } from './components/KanbanColumn';
import { OpportunityModal } from './components/OpportunityModal';
import { StageSettingsModal } from './components/StageSettingsModal';
import { updateDealStage } from '@/app/actions/pipelines';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Contact } from '@/types/crm';

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
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [targetStageId, setTargetStageId] = useState<string | null>(null);

  // 1. Optimistic UI for Opportunities
  const [optimisticOpps, updateOptimisticOpps] = useOptimistic(
    initialOpportunities,
    (state, { dealId, newStageId, newPosition }) => {
      return state.map(opp =>
        opp.id === dealId
          ? { ...opp, stage_id: newStageId, position: newPosition, updated_at: new Date().toISOString() }
          : opp
      );
    }
  );

  const handleEditDeal = (opp: Opportunity) => {
    setSelectedOpp(opp);
    setIsOppModalOpen(true);
  };

  const handleCreateDeal = (stageId?: string) => {
    setSelectedOpp(null);
    setTargetStageId(stageId || initialStages[0]?.id || null);
    setIsOppModalOpen(true);
  };

  // 2. Drag End Handler
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const dealId = draggableId;
    const newStageId = destination.droppableId;
    const newPosition = destination.index;

    // Tactical Optimistic Update
    startTransition(async () => {
      updateOptimisticOpps({ dealId, newStageId, newPosition });

      const res = await updateDealStage(dealId, newStageId, newPosition);
      if (!res.success) {
        toast.error('Tactical failure: Could not update deal stage');
      }
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 1. Header & Stats */}
      <div className="shrink-0 flex flex-col">
        <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-[#04091a]">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-[#eef2ff] uppercase tracking-tight font-space">
              {activePipeline.name}
            </h1>
            <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
            <select
              value={activePipeline.id}
              onChange={(e) => router.push(`/pipelines?pipelineId=${e.target.value}`)}
              className="bg-transparent text-[12px] font-bold text-[#4a5a82] uppercase tracking-widest focus:outline-none cursor-pointer hover:text-[#eef2ff] transition-colors"
            >
              {pipelines.map(p => (
                <option key={p.id} value={p.id} className="bg-[#0b0f1a] text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsStageModalOpen(true)}
              className="h-9 px-4 rounded-xl bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[12px] font-bold font-dm-sans transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-gear text-[11px] text-[#4a5a82]"></i>
              Stages
            </button>
            <button
              onClick={() => handleCreateDeal()}
              className="h-9 px-4 rounded-xl bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[12px] font-bold font-dm-sans transition-all flex items-center gap-2 shadow-lg shadow-[#2563eb]/20"
            >
              <i className="fa-solid fa-plus text-[11px]"></i>
              New Deal
            </button>
          </div>
        </div>

        <PipelineStats opportunities={optimisticOpps} members={members} />
      </div>

      {/* 2. Responsive Grid Board Area */}
      <div className="flex-1 overflow-y-auto common-scrollbar bg-[#04091a] p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {initialStages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                opportunities={optimisticOpps.filter(opp => opp.stage_id === stage.id)}
                onEditDeal={handleEditDeal}
                onAddDeal={() => handleCreateDeal(stage.id)}
              />
            ))}

            {/* Add Stage Placeholder */}
            <div className="flex flex-col min-h-[200px] items-center justify-center border-2 border-dashed border-white/5 rounded-2xl group hover:border-white/10 transition-all cursor-pointer bg-[#080f28]/20">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-[#2563eb]/10 transition-all">
                <i className="fa-solid fa-plus text-[#4a5a82] group-hover:text-[#2563eb]"></i>
              </div>
              <p className="text-[11px] font-bold text-[#4a5a82] uppercase tracking-[1px] group-hover:text-[#eef2ff]">Add Stage</p>
            </div>
          </div>
        </DragDropContext>
      </div>

      {/* 3. Modals */}
      <OpportunityModal
        isOpen={isOppModalOpen}
        onClose={() => setIsOppModalOpen(false)}
        opportunity={selectedOpp}
        stageId={targetStageId || undefined}
        contacts={contacts}
        stages={initialStages}
      />

      <StageSettingsModal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        pipelineId={activePipeline.id}
        initialStages={initialStages}
      />
    </div>
  );
}
