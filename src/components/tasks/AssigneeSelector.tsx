'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, User as UserIcon, Check, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AssigneeSelectorProps {
  members: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  currentUserId?: string;
}

export function AssigneeSelector({ members, selectedIds, onChange, currentUserId }: AssigneeSelectorProps) {
  const [search, setSearch] = useState('');

  const filtered = members.filter(m => {
    const name = (m.user?.first_name || '').toLowerCase();
    const email = (m.user?.email || '').toLowerCase();
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
  };

  const selectMe = () => {
    if (currentUserId && !selectedIds.includes(currentUserId)) {
      onChange([...selectedIds, currentUserId]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-bold !text-dash-textMuted">
          Assign personnel
        </label>
        {currentUserId && !selectedIds.includes(currentUserId) && (
          <button 
            onClick={selectMe}
            className="text-[9px] font-black tracking-widest text-dash-accent hover:text-dash-accent/80 transition-colors flex items-center gap-1.5"
          >
            <UserIcon className="w-3 h-3" />
            Quick Select Me
          </button>
        )}
      </div>

      <div className="bg-white border border-dash-border rounded-xl p-4 space-y-4">
        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 !text-dash-textMuted group-focus-within:text-dash-accent transition-colors" />
          <input
            placeholder="Search team database..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 bg-dash-surface border-none text-[12px] font-bold !text-dash-text focus:ring-0 pl-10 placeholder:!text-dash-textMuted"
          />
        </div>

        {/* User Pills Grid */}
        <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
          {filtered.map((member) => {
            const isSelected = selectedIds.includes(member.user_id);
            return (
              <button
                key={member.user_id}
                onClick={() => toggle(member.user_id)}
                className={cn(
                  "flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all duration-300",
                  isSelected
                    ? "bg-dash-accent/10 border-dash-accent text-dash-accent"
                    : "bg-dash-surface border-dash-border !text-dash-textMuted hover:bg-dash-border/60"
                )}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={member.user?.avatar_url} />
                  <AvatarFallback className="text-[8px] bg-dash-border/60">{member.user?.first_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-bold truncate leading-none">
                  {member.user?.first_name || 'Member'}
                </span>
                {isSelected && <Check className="w-2.5 h-2.5 ml-auto text-dash-accent" />}
              </button>
            );
          })}
        </div>

        {/* Selected Stack */}
        {selectedIds.length > 0 && (
          <div className="pt-3 border-t border-dash-border flex items-center justify-between">
            <div className="flex -space-x-2">
              {selectedIds.slice(0, 5).map((id) => {
                const m = members.find(member => member.user_id === id);
                return (
                  <Avatar key={id} className="w-8 h-8 border-2 border-white shadow-lg">
                    <AvatarImage src={m?.user?.avatar_url} />
                    <AvatarFallback className="text-[8px] bg-dash-border/60">{m?.user?.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                );
              })}
              {selectedIds.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-dash-surface border-2 border-white flex items-center justify-center text-[9px] font-black !text-dash-textMuted backdrop-blur-md">
                  +{selectedIds.length - 5}
                </div>
              )}
            </div>
            <span className="text-[11px] font-bold !text-dash-textMuted">
              {selectedIds.length} allocated
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
