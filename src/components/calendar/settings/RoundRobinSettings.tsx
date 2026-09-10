'use client';

import React from 'react';
import { Users, Check, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Task 64 — controlled round-robin enrolment panel. The old version had a
// "distribution weight" slider that the live algorithm never read (weighted
// round-robin was never built); that dead control is removed. This is now a
// straight "who is in the rotation for this booking page" list.

export interface RoundRobinMember {
  id: string;
  name: string;
  email: string | null;
  enrolled: boolean;
  bookingCount: number;
}

interface RoundRobinSettingsProps {
  members: RoundRobinMember[];
  /** currently-selected host ids (parent owns the state) */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function RoundRobinSettings({ members, selectedIds, onChange }: RoundRobinSettingsProps) {
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 rounded-xl border border-dashed border-dash-border bg-dash-surface text-center">
        <Users className="h-7 w-7 !text-dash-textMuted mb-2" />
        <p className="text-[12px] font-bold !text-dash-textMuted">No team members yet</p>
        <p className="text-[11px] !text-dash-textMuted mt-1">Invite teammates in Settings → Team before enrolling them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold !text-dash-textMuted uppercase tracking-wide">Rotation pool</span>
        <span className="text-[11px] font-medium !text-dash-textMuted">{selectedIds.length} enrolled</span>
      </div>

      <div className="bg-white border border-dash-border rounded-xl overflow-hidden divide-y divide-dash-border">
        {members.map((member) => {
          const isSelected = selectedIds.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggle(member.id)}
              className={cn(
                'w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors motion-reduce:transition-none',
                isSelected ? 'bg-dash-accent/5' : 'hover:bg-dash-surface'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0',
                    isSelected ? 'bg-dash-accent text-white' : 'bg-dash-surface !text-dash-textMuted'
                  )}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className={cn('text-[13px] font-bold truncate', isSelected ? '!text-dash-text' : '!text-dash-textMuted')}>
                    {member.name}
                  </p>
                  {member.email && <p className="text-[11px] !text-dash-textMuted truncate">{member.email}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {isSelected && member.bookingCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold !text-dash-textMuted" title="Bookings assigned so far">
                    <RotateCw size={11} /> {member.bookingCount}
                  </span>
                )}
                <span
                  className={cn(
                    'w-5 h-5 rounded-md border flex items-center justify-center',
                    isSelected ? 'bg-dash-accent border-dash-accent' : 'border-dash-border'
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedIds.length === 0 && (
        <p className="text-[11px] text-amber px-1 leading-snug">
          No hosts enrolled — bookings on this page will be created unassigned until you add at least one.
        </p>
      )}
    </div>
  );
}
