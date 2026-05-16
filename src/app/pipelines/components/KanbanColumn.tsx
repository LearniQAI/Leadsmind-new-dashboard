'use client';

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Opportunity, PipelineStage } from '@/types/crm';
import { OpportunityCard } from './OpportunityCard';

interface KanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onEditDeal: (opp: Opportunity) => void;
  onAddDeal: () => void;
}

export function KanbanColumn({ stage, opportunities, onEditDeal, onAddDeal }: KanbanColumnProps) {
  const columnValue = opportunities.reduce((acc, opp) => acc + (Number(opp.value) || 0), 0);

  // Tactical stage color mapping
  const getStageColor = (index: number) => {
    const colors = ['#3b82f6', '#ff9d00', '#10b981', '#6366f1', '#f59e0b', '#ec4899'];
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col w-full min-h-[400px] bg-[#080f28]/20 rounded-2xl border border-white/5 overflow-hidden">
      {/* Column Header */}
      <div 
        className="p-4 border-t-4 bg-[#080f28]/40"
        style={{ borderTopColor: getStageColor(stage.position) }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[13px] font-extrabold text-[#eef2ff] uppercase tracking-widest font-dm-sans flex items-center gap-2">
            {stage.name}
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md text-[#4a5a82]">
              {opportunities.length}
            </span>
          </h3>
          <button 
            onClick={onAddDeal}
            className="text-[#4a5a82] hover:text-white transition-colors"
          >
            <i className="fa-solid fa-plus text-[12px]"></i>
          </button>
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-space font-bold text-[#ff9d00]/80">
            R {columnValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-tighter">Value</span>
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={className(
              "flex-1 p-3 overflow-y-auto common-scrollbar transition-colors",
              snapshot.isDraggingOver ? "bg-[#2563eb]/5" : ""
            )}
          >
            {opportunities.map((opp, index) => (
              <OpportunityCard 
                key={opp.id} 
                opportunity={opp} 
                index={index} 
                onClick={() => onEditDeal(opp)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function className(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
