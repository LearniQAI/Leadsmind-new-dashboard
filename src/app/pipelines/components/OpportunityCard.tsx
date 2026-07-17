'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { formatDistanceToNow } from 'date-fns';
import { Opportunity } from '@/types/crm';
import { cn } from '@/lib/utils';
import { CurrencyValue } from '@/components/dashboard-ui';
import UserAvatar from '@/components/ui/UserAvatar';

interface OpportunityCardProps {
  opportunity: Opportunity;
  index: number;
  onClick: () => void;
}

// Matches the reference's card pattern: avatar on the left, contact name as
// the primary line, a muted secondary line beneath (deal value — the most
// consistently-available detail, since not every deal has recent activity
// tracked; falls back to "updated ... ago" when there's no contact at all).
export function OpportunityCard({ opportunity, index, onClick }: OpportunityCardProps) {
  const contact = opportunity.contact;
  const primaryLabel = contact ? `${contact.first_name} ${contact.last_name}` : opportunity.title;

  return (
    <Draggable draggableId={opportunity.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "bg-white border border-dash-border rounded-xl p-3.5 mb-2.5 transition-all select-none cursor-pointer hover:border-dash-accent/40",
            snapshot.isDragging ? "shadow-xl border-dash-accent/50 ring-1 ring-dash-accent/20 scale-[1.02]" : "hover:shadow-sm"
          )}
        >
          <div className="flex items-start gap-3">
            <UserAvatar
              firstName={contact?.first_name}
              lastName={contact?.last_name}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              {/* Primary: contact (or deal title, if no contact attached) —
                  the single most prominent line on the card. */}
              <p className="text-[14px] font-bold !text-dash-text leading-snug truncate">
                {primaryLabel}
              </p>
              {/* Secondary: the deal's own title field (confirmed via
                  OpportunityModal's "Opportunity Designation" input — not a
                  separate note/relationship field) — one clear step down:
                  regular weight, muted, still comfortably legible. */}
              {contact && (
                <p className="text-[12px] font-normal !text-dash-textMuted truncate mt-1 leading-snug">
                  {opportunity.title}
                </p>
              )}
              {/* Tertiary: value + relative time — smallest line, most
                  muted, both halves matched in size/weight so they read as
                  one cohesive metadata line rather than two competing ones. */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <CurrencyValue value={opportunity.value} className="text-[11px] font-medium !text-dash-textMuted" />
                <span className="text-[11px] font-medium !text-dash-textMuted">
                  · {formatDistanceToNow(new Date(opportunity.updated_at || opportunity.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
