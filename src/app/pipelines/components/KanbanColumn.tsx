'use client';

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus, Inbox } from 'lucide-react';
import { Opportunity, PipelineStage } from '@/types/crm';
import { OpportunityCard } from './OpportunityCard';
import { cn } from '@/lib/utils';
import { DashEmptyState, CurrencyValue } from '@/components/dashboard-ui';
import { getStageTheme } from '../lib/stageColors';

interface KanbanColumnProps {
  stage: PipelineStage;
  stageIndex: number;
  stageCount: number;
  opportunities: Opportunity[];
  onEditDeal: (opp: Opportunity) => void;
  onAddDeal: () => void;
  /** Passed straight through to each OpportunityCard's own quick-delete —
   *  same callback PipelinesClient already hands OpportunityModal, so a
   *  card-level delete updates this column's count/subtotal (both computed
   *  from the `opportunities` prop below) through the identical mechanism. */
  onSaved: (opp: Opportunity, action: 'create' | 'update' | 'delete') => void;
  /** Show the full "Add deal" CTA button in this column's empty state only
   *  when the whole pipeline has zero deals — otherwise the inline "+" next
   *  to the count badge above is the deal-adding affordance, and repeating
   *  a full-width button in every empty stage column is just noise. */
  showEmptyStateAction?: boolean;
}

export function KanbanColumn({ stage, stageIndex, stageCount, opportunities, onEditDeal, onAddDeal, onSaved, showEmptyStateAction = true }: KanbanColumnProps) {
  const columnValue = opportunities.reduce((acc, opp) => acc + (Number(opp.value) || 0), 0);
  // Stage-tier color is now used ONLY for a 2px top border — a subtle,
  // muted-tone signal rather than the previous tinted-background + colored
  // badge + colored total-value treatment, matching the reference's
  // near-zero color variation between columns. Primary actions (the "+ Add
  // deal" button below) use the one consistent dash-accent blue instead.
  const theme = getStageTheme(stageIndex, stageCount);

  return (
    <div className="flex flex-col w-full min-h-[220px] bg-white rounded-2xl border border-dash-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {/* Column Header */}
      <div className="p-4 border-t-2" style={{ borderTopColor: theme.solid }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-[14px] font-bold font-display !text-dash-text tracking-wide min-w-0 truncate">
            {stage.name}
          </h3>
          <span
            className="text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0"
            style={{ backgroundColor: theme.badgeBg, color: theme.solid }}
          >
            {opportunities.length}
          </span>
        </div>

        <button
          onClick={onAddDeal}
          className="w-full h-8 rounded-lg border border-dash-border !text-dash-textMuted hover:border-dash-accent hover:!text-dash-accent hover:bg-dash-accent/5 transition-colors motion-reduce:transition-none text-[11px] font-semibold flex items-center justify-center gap-1.5"
        >
          <Plus size={12} />
          Add deal
        </button>

        {columnValue > 0 && (
          <p className="mt-3 text-[11px] !text-dash-textMuted">
            <CurrencyValue value={columnValue} minimumFractionDigits={0} maximumFractionDigits={0} className="font-bold !text-dash-text" /> total
          </p>
        )}
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-2.5 overflow-y-auto light-scrollbar transition-colors motion-reduce:transition-none",
              snapshot.isDraggingOver ? "bg-dash-accent/5" : ""
            )}
          >
            {opportunities.length === 0 && !snapshot.isDraggingOver && (
              <DashEmptyState
                icon={Inbox}
                title="No deals yet"
                description={showEmptyStateAction ? "Drag a deal here or add one directly." : undefined}
                actionLabel={showEmptyStateAction ? "Add deal" : undefined}
                onAction={showEmptyStateAction ? onAddDeal : undefined}
                compact
              />
            )}
            {opportunities.map((opp, index) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                index={index}
                onClick={() => onEditDeal(opp)}
                onSaved={onSaved}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
