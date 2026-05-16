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
    setTargetStageId(stageId || (initialStages.length > 0 ? initialStages[0].id : null));
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
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#04091a]">
      {/* 1. Header Area */}
      <div className="shrink-0 flex flex-col">
        <div className="h-[72px] px-8 border-b border-white/[0.05] flex items-center justify-between bg-[#04091a]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-[14px] font-bold text-[#3b82f6] uppercase tracking-[2px] font-display leading-none mb-1.5">
                Strategic <span className="text-white">Pipelines</span>
              </h1>
              <div className="flex items-center gap-2">
                <select
                  value={activePipeline.id}
                  onChange={(e) => router.push(`/pipelines?pipelineId=${e.target.value}`)}
                  className="bg-transparent text-[16px] font-extrabold text-[#eef2ff] focus:outline-none cursor-pointer hover:text-[#3b82f6] transition-colors appearance-none min-w-[140px]"
                >
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#0b0f1a] text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></div>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-white/10"></div>

            <button 
              onClick={() => setIsPipelineModalOpen(true)}
              className="group flex items-center gap-2 h-10 px-4 rounded-[12px] bg-white/[0.03] border border-white/[0.05] text-[#4a5a82] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-all"
              title="Add New Pipeline"
            >
              <i className="fa-solid fa-plus text-[12px] group-hover:scale-110 transition-transform"></i>
              <span className="text-[11px] font-bold uppercase tracking-wider">New Pipeline</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsStageModalOpen(true)}
              className="h-11 px-6 rounded-[12px] bg-white/[0.03] border border-white/[0.07] text-[#eef2ff] hover:bg-white/[0.06] text-[12px] font-bold font-dm-sans transition-all flex items-center gap-2.5 active:scale-[0.98]"
            >
              <i className="fa-solid fa-layer-group text-[12px] text-[#4a5a82]"></i>
              Architect Stages
            </button>
            <button
              onClick={() => handleCreateDeal()}
              className="h-11 px-6 rounded-[12px] bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-[12px] font-bold font-dm-sans transition-all flex items-center gap-2.5 shadow-xl shadow-[#2563eb]/20 active:scale-[0.98]"
            >
              <i className="fa-solid fa-plus text-[12px]"></i>
              Launch Deal
            </button>
          </div>
        </div>

        <PipelineStats opportunities={optimisticOpps} members={members} />
      </div>

      {/* 2. Responsive Grid Board Area */}
      <div className="flex-1 overflow-x-auto common-scrollbar bg-[#04091a] p-8">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex items-start gap-8 min-h-full">
            {initialStages.map((stage) => (
              <div key={stage.id} className="w-[320px] shrink-0">
                <KanbanColumn
                  stage={stage}
                  opportunities={optimisticOpps.filter(opp => opp.stage_id === stage.id)}
                  onEditDeal={handleEditDeal}
                  onAddDeal={() => handleCreateDeal(stage.id)}
                />
              </div>
            ))}

            {/* Add Stage Placeholder */}
            <div 
              onClick={() => setIsStageModalOpen(true)}
              className="w-[320px] shrink-0 h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-white/[0.03] rounded-[24px] group hover:border-[#2563eb]/30 transition-all cursor-pointer bg-[#080f28]/10 hover:bg-[#2563eb]/5"
            >
              <div className="w-14 h-14 rounded-[16px] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-4 group-hover:bg-[#2563eb]/10 group-hover:border-[#2563eb]/20 group-hover:scale-110 transition-all shadow-inner">
                <i className="fa-solid fa-plus text-[#2a3557] group-hover:text-[#3b82f6] text-xl"></i>
              </div>
              <p className="text-[12px] font-bold text-[#2a3557] uppercase tracking-[2px] group-hover:text-[#eef2ff] transition-colors">Add Pipeline Stage</p>
              <p className="text-[10px] text-[#2a3557] mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">Architect Level</p>
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

      <CreatePipelineModal 
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
      />
    </div>
  );
}
