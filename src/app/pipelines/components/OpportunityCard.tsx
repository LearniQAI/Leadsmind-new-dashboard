'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { MoreHorizontal, UserCircle2, Zap, User } from 'lucide-react';
import { Opportunity } from '@/types/crm';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface OpportunityCardProps {
  opportunity: Opportunity;
  index: number;
  onClick: () => void;
}

export function OpportunityCard({ opportunity, index, onClick }: OpportunityCardProps) {
  return (
    <Draggable draggableId={opportunity.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "bg-white border border-dash-border rounded-xl p-4 mb-3 transition-all select-none group hover:border-dash-accent/30",
            snapshot.isDragging ? "shadow-2xl shadow-dash-text/10 border-dash-accent/50 ring-1 ring-dash-accent/20 scale-[1.02]" : "hover:shadow-lg"
          )}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <h5 className="text-[13px] font-bold !text-dash-text leading-snug group-hover:text-dash-accent transition-colors">
                {opportunity.title}
              </h5>
              <div className="!text-dash-textMuted hover:!text-dash-text transition-colors cursor-pointer">
                <MoreHorizontal size={12} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[14px]  font-bold text-amber-600 tracking-tight">
                R {Number(opportunity.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-dash-border">
              {opportunity.contact && (
                <Link 
                  href={`/contacts/${opportunity.contact.id}`}
                  className="flex items-center gap-2 text-[11px] !text-dash-textMuted hover:text-dash-accent transition-colors "
                >
                  <UserCircle2 size={10} className="!text-dash-textMuted" />
                  {opportunity.contact.first_name} {opportunity.contact.last_name}
                </Link>
              )}
              
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold !text-dash-textMuted tracking-wider bg-dash-surface px-2 py-0.5 rounded-full">
                    <Zap size={10} className="text-dash-accent" />
                    Hot
                  </div>
                </div>

                <div className="flex -space-x-1">
                  <div className="w-5 h-5 rounded-full border border-white bg-dash-border flex items-center justify-center text-[7px] !text-dash-textMuted">
                    <User size={9} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
