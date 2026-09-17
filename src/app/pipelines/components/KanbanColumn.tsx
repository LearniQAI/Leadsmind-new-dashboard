'use client';

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus, Inbox, Loader2, ChevronDown } from 'lucide-react';
import { Opportunity, PipelineStage } from '@/types/crm';
import { OpportunityCard } from './OpportunityCard';
import { cn } from '@/lib/utils';
import { DashEmptyState } from '@/components/dashboard-ui';
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
  /** This stage's REAL total deal count — `opportunities` above may only be
   *  the first loaded page. Drives the "Load more" affordance below. */
  totalCount?: number;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export function KanbanColumn({ stage, stageIndex, stageCount, opportunities, onEditDeal, onAddDeal, onSaved, showEmptyStateAction = true, totalCount, onLoadMore, loadingMore }: KanbanColumnProps) {
  const columnValue = opportunities.reduce((acc, opp) => acc + (Number(opp.value) || 0), 0);
  // Stage-tier color is now used ONLY for a 2px top border — a subtle,
  // muted-tone signal rather than the previous tinted-background + colored
  // badge + colored total-value treatment, matching the reference's
  // near-zero color variation between columns. Primary actions (the "+ Add
  // deal" button below) use the one consistent dash-accent blue instead.
  const theme = getStageTheme(stageIndex, stageCount);

  return (
    <div className="flex flex-col w-full min-h-[220px] bg-white rounded-2xl border border-dash-border overflow-hidden shadow-[0_2px_10px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.07)] transition-shadow duration-200 motion-reduce:transition-none">
      {/* Column Header */}
      <div className="p-4 border-t-[3px]" style={{ borderTopColor: theme.solid }}>
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <h3 className="text-[15px] font-bold !text-dash-text tracking-tight min-w-0 truncate">
            {stage.name}
          </h3>
          <span
            className="text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0 tabular-nums"
            style={{ backgroundColor: theme.badgeBg, color: theme.solid }}
            title={totalCount !== undefined && totalCount > opportunities.length ? `${opportunities.length} loaded of ${totalCount} total` : undefined}
          >
            {totalCount ?? opportunities.length}
          </span>
        </div>

        <button
          onClick={onAddDeal}
          className="w-full h-9 rounded-xl border border-dash-border bg-dash-surface/60 !text-dash-textMuted hover:border-dash-accent hover:!text-dash-accent hover:bg-dash-accent/5 transition-colors motion-reduce:transition-none text-[11px] font-bold flex items-center justify-center gap-1.5"
        >
          <Plus size={12} />
          Add deal
        </button>

        {columnValue > 0 && (
          <p className="mt-3 text-[11px] !text-dash-textMuted tabular-nums">
            <span className="font-bold !text-dash-text">R {columnValue.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</span> total
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
            {/* Pagination, not virtualization (see build decision) — bounds
                the rendered DOM directly by only ever rendering what's been
                explicitly loaded, growing one page at a time on request
                rather than rendering hundreds of cards up front. Hidden
                mid-drag so it never sits inside the reordering droppable
                space while a card is being placed. */}
            {totalCount !== undefined && totalCount > opportunities.length && !snapshot.isDraggingOver && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="w-full mt-1 h-8 rounded-lg !text-dash-textMuted hover:!text-dash-accent hover:bg-dash-accent/5 transition-colors motion-reduce:transition-none text-[11px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <ChevronDown size={12} />
                )}
                Load {Math.min(50, totalCount - opportunities.length)} more
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
