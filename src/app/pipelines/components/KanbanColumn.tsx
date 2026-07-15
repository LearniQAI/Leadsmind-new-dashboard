'use client';

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus, Inbox } from 'lucide-react';
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
  /** Show the full "Add deal" CTA button in this column's empty state only
   *  when the whole pipeline has zero deals — otherwise the inline "+" next
   *  to the count badge above is the deal-adding affordance, and repeating
   *  a full-width button in every empty stage column is just noise. */
  showEmptyStateAction?: boolean;
}

// Belt-and-suspenders fix for "R 0.00" reading as "R O.OO": DM Sans's zero
// glyph is a plain oval that's visually close to a capital O at small/bold
// sizes. `font-variant-numeric` + the lower-level `font-feature-settings`
// request the font's slashed-zero glyph where supported; kept on DM Sans
// (not swapped to a different typeface) per the type-system pass, which
// reserves Space Grotesk for headings/display only.
const NUMERIC_STYLE: React.CSSProperties = {
  fontVariantNumeric: "slashed-zero tabular-nums",
  fontFeatureSettings: '"zero" 1',
};

export function KanbanColumn({ stage, stageIndex, stageCount, opportunities, onEditDeal, onAddDeal, showEmptyStateAction = true }: KanbanColumnProps) {
  const columnValue = opportunities.reduce((acc, opp) => acc + (Number(opp.value) || 0), 0);
  const theme = getStageTheme(stageIndex, stageCount);

  return (
    <div className="flex flex-col w-full min-h-[220px] bg-dash-surface rounded-2xl border border-dash-border overflow-hidden">
      {/* Column Header */}
      <div className="p-3.5 border-t-4" style={{ borderTopColor: theme.solid, backgroundColor: theme.tint }}>
        <div className="flex items-center justify-between mb-2 gap-2">
          <h3 className="text-[12px] font-bold !text-dash-text tracking-wide min-w-0 truncate">
            {stage.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: theme.badgeBg, color: theme.solid }}
            >
              {opportunities.length}
            </span>
            <button
              onClick={onAddDeal}
              className="!text-dash-textMuted hover:text-dash-accent transition-colors"
              title="Add deal to this stage"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span
            className="text-[17px] font-bold leading-none"
            style={{ color: theme.solid, ...NUMERIC_STYLE }}
          >
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
              "flex-1 p-2.5 overflow-y-auto common-scrollbar transition-colors motion-reduce:transition-none",
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
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
