'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PipelineStage, Opportunity } from '@/types/crm';
import { updateDealStage } from '@/app/actions/pipelines';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DealModal } from './DealModal';

interface KanbanBoardProps {
  stages: PipelineStage[];
  opportunities: Opportunity[];
}

export function KanbanBoard({ stages, opportunities: initialDeals }: KanbanBoardProps) {
  const [deals, setDeals] = useState(initialDeals);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    stageId?: string;
    deal?: Opportunity;
  }>({ isOpen: false });

  useEffect(() => {
    setDeals(initialDeals);
  }, [initialDeals]);

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const updatedDeals = [...deals];
    const dealIndex = updatedDeals.findIndex(d => d.id === draggableId);
    if (dealIndex === -1) return;

    const [removed] = updatedDeals.splice(dealIndex, 1);
    removed.stage_id = destination.droppableId;
    removed.position = destination.index;
    updatedDeals.splice(destination.index, 0, removed);

    setDeals(updatedDeals);

    try {
      const res = await updateDealStage(draggableId, destination.droppableId, destination.index);
      if (!res.success) {
        toast.error(res.error || 'Failed to move deal');
        setDeals(initialDeals);
      }
    } catch {
      toast.error('Network error moving deal');
      setDeals(initialDeals);
    }
  };

  const opportunitiesByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter((d) => d.stage_id === stage.id).sort((a, b) => a.position - b.position);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  const calculateStageTotal = (stageId: string) => {
    return opportunitiesByStage[stageId]?.reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;
  };

  const openNewDeal = (stageId?: string) => {
    setModalState({ isOpen: true, stageId: stageId || stages[0]?.id });
  };

  const openEditDeal = (deal: Opportunity) => {
    setModalState({ isOpen: true, deal });
  };

  return (
    <div className="h-full flex flex-col">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 h-full overflow-x-auto pb-6 common-scrollbar">
          {stages.map((stage) => {
            const stageTotal = calculateStageTotal(stage.id);
            const stageDeals = opportunitiesByStage[stage.id] || [];

            return (
              <div key={stage.id} className="w-[280px] sm:w-[300px] shrink-0 flex flex-col gap-4 h-full group/column">
                {/* Column Header */}
                <div className="bg-dash-surface border border-dash-border rounded-[16px] p-4 shrink-0 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-[3px] h-full bg-dash-accent" />
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-dash-text bg-dash-bg w-6 h-6 rounded-md flex items-center justify-center font-space-grotesk">
                        {stageDeals.length}
                      </span>
                      <h3 className="text-[13px] font-bold text-dash-text uppercase tracking-widest font-space-grotesk truncate max-w-[150px]">
                        {stage.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => openNewDeal(stage.id)}
                      className="text-dash-textMuted hover:text-dash-text transition-colors"
                    >
                      <i className="fa-solid fa-plus text-[12px]"></i>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-dash-textMuted uppercase tracking-[1.5px] font-dm-sans">Value:</span>
                    <span className="text-[13px] font-bold text-emerald-600 font-space-grotesk">
                      ${stageTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Column Body */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "flex-1 flex flex-col gap-3 min-h-[200px] rounded-[16px] transition-all duration-300",
                        snapshot.isDraggingOver ? "bg-dash-accent/5" : "bg-transparent"
                      )}
                    >
                      {stageDeals.map((opp, index) => (
                        <Draggable key={opp.id} draggableId={opp.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => openEditDeal(opp)}
                              className={cn(
                                "bg-dash-bg border border-dash-border rounded-[12px] p-4 cursor-pointer transition-all hover:border-dash-accent/40 hover:shadow-md group",
                                snapshot.isDragging ? "shadow-[0_20px_50px_rgba(19,89,255,0.18)] border-dash-accent/60 z-50 scale-[1.02]" : "shadow-sm"
                              )}
                            >
                              <div className="flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-3">
                                  <h4 className="text-[13.5px] font-bold text-dash-text group-hover:text-dash-accent transition-colors font-dm-sans leading-tight">
                                    {opp.title}
                                  </h4>
                                  <i className="fa-solid fa-ellipsis-vertical text-dash-textMuted text-[12px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </div>

                                {opp.contact && (
                                  <div className="flex items-center gap-2.5 py-2 px-2.5 bg-dash-surface border border-dash-border rounded-lg">
                                    <div className="w-5 h-5 rounded-md bg-dash-border/60 flex items-center justify-center text-[9px] font-bold text-dash-textMuted font-space-grotesk uppercase">
                                      {opp.contact.first_name[0]}{opp.contact.last_name[0]}
                                    </div>
                                    <span className="text-[10.5px] font-semibold text-dash-textMuted truncate font-dm-sans">
                                      {opp.contact.first_name} {opp.contact.last_name}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-dash-border">
                                  <div className="flex items-center gap-1.5 text-emerald-600">
                                    <i className="fa-solid fa-dollar-sign text-[11px]"></i>
                                    <span className="text-[14px] font-bold font-space-grotesk">
                                      {opp.value.toLocaleString()}
                                    </span>
                                  </div>

                                  {opp.tags && opp.tags.length > 0 && (
                                    <div className="flex gap-1">
                                      <span className="text-[8px] bg-dash-accent/10 text-dash-accent px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
                                        {opp.tags[0]}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <DealModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false })}
        stageId={modalState.stageId}
        initialData={modalState.deal}
      />
    </div>
  );
}
