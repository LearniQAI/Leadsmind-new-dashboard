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
        <label className="text-[10px] font-bold uppercase tracking-[0.6px] text-[#4a5a82] font-dm-sans">
          ASSIGN PERSONNEL
        </label>
        {currentUserId && !selectedIds.includes(currentUserId) && (
          <button 
            onClick={selectMe}
            className="text-[9px] font-black uppercase tracking-widest text-[#2563eb] hover:text-[#2563eb]/80 transition-colors flex items-center gap-1.5"
          >
            <UserIcon className="w-3 h-3" />
            Quick Select Me
          </button>
        )}
      </div>

      <div className="bg-[#080f28] border border-white/5 rounded-xl p-4 space-y-4">
        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a5a82] group-focus-within:text-[#2563eb] transition-colors" />
          <input 
            placeholder="SEARCH TEAM DATABASE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 bg-white/[0.02] border-none text-[10px] font-bold text-white focus:ring-0 pl-10 placeholder:text-[#4a5a82] placeholder:tracking-widest"
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
                    ? "bg-[#2563eb]/10 border-[#2563eb] text-white" 
                    : "bg-white/[0.02] border-white/5 text-white/30 hover:bg-white/5"
                )}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={member.user?.avatar_url} />
                  <AvatarFallback className="text-[8px] bg-white/10">{member.user?.first_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-bold truncate leading-none">
                  {member.user?.first_name || 'Member'}
                </span>
                {isSelected && <Check className="w-2.5 h-2.5 ml-auto text-[#2563eb]" />}
              </button>
            );
          })}
        </div>

        {/* Selected Stack */}
        {selectedIds.length > 0 && (
          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <div className="flex -space-x-2">
              {selectedIds.slice(0, 5).map((id) => {
                const m = members.find(member => member.user_id === id);
                return (
                  <Avatar key={id} className="w-8 h-8 border-2 border-[#080f28] shadow-lg">
                    <AvatarImage src={m?.user?.avatar_url} />
                    <AvatarFallback className="text-[8px] bg-white/10">{m?.user?.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                );
              })}
              {selectedIds.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-white/5 border-2 border-[#080f28] flex items-center justify-center text-[9px] font-black text-white/40 backdrop-blur-md">
                  +{selectedIds.length - 5}
                </div>
              )}
            </div>
            <span className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-widest">
              {selectedIds.length} ALLOCATED
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
