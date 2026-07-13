'use client';

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { Opportunity, PipelineStage } from '@/types/crm';
import { OpportunityCard } from './OpportunityCard';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col w-full min-h-[400px] bg-dash-surface rounded-2xl border border-dash-border overflow-hidden">
      {/* Column Header */}
      <div 
        className="p-4 border-t-4 bg-dash-surface"
        style={{ borderTopColor: getStageColor(stage.position) }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[13px] font-extrabold !text-dash-text tracking-widest  flex items-center gap-2">
            {stage.name}
            <span className="text-[10px] bg-dash-border/60 px-1.5 py-0.5 rounded-md !text-dash-textMuted">
              {opportunities.length}
            </span>
          </h3>
          <button
            onClick={onAddDeal}
            className="!text-dash-textMuted hover:text-dash-accent transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="text-[14px]  font-bold text-amber-600">
            R {columnValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-[9px] font-bold !text-dash-textMuted tracking-tighter">Value</span>
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-3 overflow-y-auto common-scrollbar transition-colors",
              snapshot.isDraggingOver ? "bg-dash-accent/5" : ""
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
