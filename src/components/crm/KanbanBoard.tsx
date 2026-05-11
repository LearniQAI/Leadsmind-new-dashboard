'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal, User, DollarSign, Target } from 'lucide-react';
import { updateDealStage } from '@/app/actions/pipelines';
import { PipelineStage, Opportunity } from '@/types/crm.types';
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

 // Update deals when initialDeals changes
 useEffect(() => {
  setDeals(initialDeals);
 }, [initialDeals]);

 const onDragEnd = async (result: any) => {
  const { destination, source, draggableId } = result;
  if (!destination) return;
  if (destination.droppableId === source.droppableId && destination.index === source.index) return;

  // Optimistic UI
  const updatedDeals = [...deals];
  const dealIndex = updatedDeals.findIndex(d => d.id === draggableId);
  if (dealIndex === -1) return;

  const [removed] = updatedDeals.splice(dealIndex, 1);
  const oldStageId = removed.stage_id;
  const oldPosition = removed.position;

  removed.stage_id = destination.droppableId;
  removed.position = destination.index;
  updatedDeals.splice(destination.index, 0, removed);
  
  setDeals(updatedDeals);

  try {
   const res = await updateDealStage(draggableId, destination.droppableId, destination.index);
   if (!res.success) {
    toast.error(res.error || 'Failed to move deal');
    setDeals(initialDeals); // Revert
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

 const openNewDeal = (stageId?: string) => {
  setModalState({ isOpen: true, stageId: stageId || stages[0]?.id });
 };

 const openEditDeal = (deal: Opportunity) => {
  setModalState({ isOpen: true, deal });
 };

 return (
  <div className="flex flex-col gap-6 h-full relative">
   {/* Dashboard Section Header */}
   <div className="flex justify-between items-end mb-4 px-2">
     <div className="space-y-1">
      <h2 className="card__title !text-2xl uppercase tracking-tight">Pipeline Board</h2>
      <p className="card__sub-title !text-[10px] uppercase tracking-[0.2em]">Manage your active sales opportunities</p>
     </div>
     <button 
      onClick={() => openNewDeal()}
      className="btn btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-8 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
     >
      <Plus className="h-4 w-4 mr-2" />
      <span>New Deal</span>
     </button>
   </div>

   <DragDropContext onDragEnd={onDragEnd}>
    <div className="flex gap-6 overflow-x-auto pb-10 scrollbar-thin scrollbar-thumb-white/5 min-h-[calc(100vh-320px)] px-2">
     {stages.map((stage) => (
      <div key={stage.id} className="w-[340px] shrink-0 flex flex-col gap-5 group/column">
       {/* Column Header */}
       <div className="card__wrapper !p-5 !mb-0 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
          <div className="card__icon !w-8 !h-8 !text-sm">
           {opportunitiesByStage[stage.id]?.length || 0}
          </div>
          <h3 className="card__sub-title !mb-0 !text-sm uppercase tracking-[0.1em]">{stage.name}</h3>
         </div>
         <button 
          className="h-8 w-8 text-white/10 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center justify-center"
          onClick={() => openNewDeal(stage.id)}
         >
          <Plus className="h-4 w-4" />
         </button>
        </div>
       </div>

       {/* Column Body */}
       <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
         <div
          {...provided.droppableProps}
          ref={provided.innerRef}
          className={cn(
           "flex-1 flex flex-col gap-4 p-1 rounded-3xl transition-all duration-300",
           snapshot.isDraggingOver ? "bg-white/[0.02]" : "bg-transparent"
          )}
         >
          {opportunitiesByStage[stage.id]?.map((opp, index) => (
           <Draggable key={opp.id} draggableId={opp.id} index={index}>
            {(provided, snapshot) => (
             <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={cn(
               "card__wrapper !p-5 !mb-0 transition-all hover:border-primary/40 group",
               snapshot.isDragging && "shadow-[0_20px_50px_rgba(108,71,255,0.2)] border-primary/60 bg-[#0e0e1a] scale-[1.03] rotate-[1deg]"
              )}
             >
              <div className="flex flex-col gap-5">
               <div className="flex items-start justify-between gap-3">
                <span className="card__sub-title !text-base !mb-0 group-hover:text-primary transition-colors">{opp.title}</span>
                <button 
                 className="h-7 w-7 text-white/5 hover:text-white hover:bg-white/5 rounded-lg transition-all shrink-0 flex items-center justify-center"
                 onClick={() => openEditDeal(opp)}
                >
                 <MoreHorizontal className="h-4 w-4" />
                </button>
               </div>

               {/* CONTACT CHIP */}
               {opp.contact && (
                <div className="flex items-center gap-3 py-2 px-3 bg-white/[0.02] border border-white/5 rounded-xl">
                 <div className="card__icon !w-6 !h-6 !text-[10px]">
                   <User className="h-3 w-3" />
                 </div>
                 <span className="card__desc !text-[10px] !mb-0 truncate">
                  {opp.contact.first_name} {opp.contact.last_name}
                 </span>
                </div>
               )}
               
               <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-emerald-400">
                   <DollarSign className="h-4 w-4" />
                   <span className="card__title !text-lg !mb-0">
                    {opp.value.toLocaleString()}
                   </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                 {opp.contact?.total_invoiced ? (
                  <div className={cn(
                   "flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.1em] transition-all",
                   opp.contact.outstanding_balance! > 0 
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_15px_-5px_rgba(245,158,11,0.4)]" 
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_-5px_rgba(16,185,129,0.4)]"
                  )}>
                    {opp.contact.outstanding_balance! > 0 && <div className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />}
                    Invoiced
                  </div>
                 ) : null}
                </div>
               </div>
              </div>
             </div>
            )}
           </Draggable>
          ))}
          {provided.placeholder}

          {/* Placeholder "Quick Add" for empty columns */}
          {opportunitiesByStage[stage.id]?.length === 0 && (
           <button 
            onClick={() => openNewDeal(stage.id)}
            className="group flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/5 rounded-3xl hover:border-primary/20 hover:bg-primary/[0.02] transition-all"
           >
             <div className="card__icon !w-10 !h-10 mb-3 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
              <Plus className="h-5 w-5 text-white/10 group-hover:text-primary" />
             </div>
             <span className="card__desc !text-[9px] !mb-0 uppercase tracking-[0.2em] group-hover:text-white/40">Add Opportunity</span>
           </button>
          )}
         </div>
        )}
       </Droppable>
      </div>
     ))}
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
