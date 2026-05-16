'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
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
            "bg-[#0b0f1a] border border-white/5 rounded-xl p-4 mb-3 transition-all select-none group hover:border-[#2563eb]/30",
            snapshot.isDragging ? "shadow-2xl shadow-black/50 border-[#2563eb]/50 ring-1 ring-[#2563eb]/20 scale-[1.02]" : "hover:shadow-lg"
          )}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <h5 className="text-[13px] font-bold text-[#eef2ff] leading-snug group-hover:text-[#3b82f6] transition-colors">
                {opportunity.title}
              </h5>
              <div className="text-[#4a5a82] hover:text-white transition-colors cursor-pointer">
                <i className="fa-solid fa-ellipsis text-[12px]"></i>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[14px] font-space font-bold text-[#ff9d00] tracking-tight">
                R {Number(opportunity.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.03]">
              {opportunity.contact && (
                <Link 
                  href={`/contacts/${opportunity.contact.id}`}
                  className="flex items-center gap-2 text-[11px] text-[#94a3c8] hover:text-[#3b82f6] transition-colors font-dm-sans"
                >
                  <i className="fa-solid fa-circle-user text-[10px] text-[#4a5a82]"></i>
                  {opportunity.contact.first_name} {opportunity.contact.last_name}
                </Link>
              )}
              
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full">
                    <i className="fa-solid fa-bolt text-[#3b82f6]"></i>
                    Hot
                  </div>
                </div>
                
                <div className="flex -space-x-1">
                  <div className="w-5 h-5 rounded-full border border-[#0b0f1a] bg-[#1a1f3d] flex items-center justify-center text-[7px] text-white/40">
                    <i className="fa-solid fa-user"></i>
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
