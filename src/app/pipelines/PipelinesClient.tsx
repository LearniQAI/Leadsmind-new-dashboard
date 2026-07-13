'use client';

import React, { useState, useOptimistic, useTransition } from 'react';
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
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* 1. Header Area */}
      <div className="shrink-0 flex flex-col">
        <div className="h-[72px] px-8 border-b border-dash-border flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-[14px] font-bold text-dash-accent tracking-[2px] font-display leading-none mb-1.5">
                Strategic <span className="!text-dash-text">Pipelines</span>
              </h1>
              <div className="flex items-center gap-2">
                <select
                  value={activePipeline.id}
                  onChange={(e) => router.push(`/pipelines?pipelineId=${e.target.value}`)}
                  className="bg-transparent text-[16px] font-extrabold !text-dash-text focus:outline-none cursor-pointer hover:text-dash-accent transition-colors appearance-none min-w-[140px]"
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
              className="h-11 px-6 rounded-[12px] bg-dash-surface border border-dash-border !text-dash-text hover:bg-dash-border/60 text-[12px] font-bold  transition-all flex items-center gap-2.5 active:scale-[0.98]"
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

        <PipelineStats opportunities={optimisticOpps} members={members} />
      </div>

      {/* 2. Responsive Grid Board Area */}
      <div className="flex-1 overflow-x-auto common-scrollbar bg-white p-8">
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
              className="w-[320px] shrink-0 h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-dash-border rounded-[24px] group hover:border-dash-accent/30 transition-all cursor-pointer bg-dash-surface hover:bg-dash-accent/5"
            >
              <div className="w-14 h-14 rounded-[16px] bg-dash-surface border border-dash-border flex items-center justify-center mb-4 group-hover:bg-dash-accent/10 group-hover:border-dash-accent/20 group-hover:scale-110 transition-all shadow-inner">
                <Plus size={20} className="!text-dash-textMuted group-hover:text-dash-accent" />
              </div>
              <p className="text-[12px] font-bold !text-dash-textMuted tracking-[2px] group-hover:!text-dash-text transition-colors">Add pipeline stage</p>
              <p className="text-[10px] !text-dash-textMuted mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">Architect Level</p>
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
