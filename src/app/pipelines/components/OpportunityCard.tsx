'use client';

import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Opportunity } from '@/types/crm';
import { cn } from '@/lib/utils';
import { CurrencyValue } from '@/components/dashboard-ui';
import UserAvatar from '@/components/ui/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { deleteOpportunity } from '@/app/actions/pipelines';

interface OpportunityCardProps {
  opportunity: Opportunity;
  index: number;
  onClick: () => void;
  /** Same signature/mechanism OpportunityModal already uses to tell the
   *  board a create/update/delete resolved — reused here rather than
   *  building a second delete path, so the card's quick-delete updates the
   *  exact same local state (and therefore the same stage subtotal/count
   *  and page-level stats, both derived from that state) the modal's own
   *  delete button already does. */
  onSaved: (opportunity: Opportunity, action: 'create' | 'update' | 'delete') => void;
}

// Matches the reference's card pattern: avatar on the left, contact name as
// the primary line, a muted secondary line beneath (deal value — the most
// consistently-available detail, since not every deal has recent activity
// tracked; falls back to "updated ... ago" when there's no contact at all).
export function OpportunityCard({ opportunity, index, onClick, onSaved }: OpportunityCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const contact = opportunity.contact;
  const primaryLabel = contact ? `${contact.first_name} ${contact.last_name}` : opportunity.title;

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await deleteOpportunity(opportunity.id);
    setIsDeleting(false);
    if (res.success) {
      toast.success('Deal purged from pipeline');
      onSaved(opportunity, 'delete');
    } else {
      toast.error(res.error || 'Failed to delete deal');
    }
  };

  return (
    <Draggable draggableId={opportunity.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "group relative bg-white border border-dash-border rounded-xl p-3.5 mb-2.5 transition-all select-none cursor-pointer hover:border-dash-accent/40",
            snapshot.isDragging ? "shadow-xl border-dash-accent/50 ring-1 ring-dash-accent/20 scale-[1.02]" : "hover:shadow-sm"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center !text-dash-textMuted opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 hover:bg-dash-surface hover:!text-dash-text transition-opacity"
              >
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onClick}>
                <Pencil size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-red focus:text-red">
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-start gap-3">
            <UserAvatar
              firstName={contact?.first_name}
              lastName={contact?.last_name}
              size="sm"
            />
            <div className="min-w-0 flex-1 pr-5">
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

          <ConfirmDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Delete this deal?"
            description="This action can't be undone. This opportunity and its tactical data will be permanently removed from the pipeline."
            confirmLabel={isDeleting ? 'Deleting...' : 'Yes, delete deal'}
            cancelLabel="Keep deal"
            variant="danger"
          />
        </div>
      )}
    </Draggable>
  );
}
