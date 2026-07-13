'use client';

import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Check, X, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { getAssignableMembers } from '@/app/actions/tasks';
import { cn } from '@/lib/utils';

interface AssigneePickerProps {
  currentAssignees: any[];
  onToggle: (userId: string) => void;
}

export function AssigneePicker({ currentAssignees, onToggle }: AssigneePickerProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    const res = await getAssignableMembers();
    if (res.data) {
      // Filter logic: In a real app we'd check permissions. 
      // For now we'll assume all workspace members have task access.
      setMembers(res.data);
    }
  }

  const filteredMembers = members.filter(m => 
    (m.user?.first_name + ' ' + m.user?.last_name).toLowerCase().includes(search.toLowerCase()) ||
    m.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const isAssigned = (userId: string) => currentAssignees.some(a => a.user_id === userId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 p-1.5 rounded-xl bg-dash-surface border border-dash-border hover:border-dash-accent/40 transition-all group">
          <div className="w-8 h-8 rounded-full border-2 border-dashed border-dash-border flex items-center justify-center !text-dash-textMuted group-hover:text-dash-accent transition-colors">
            <UserPlus className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold !text-dash-textMuted group-hover:!text-dash-textMuted pr-2">Assign Team</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0 bg-white border-dash-border shadow-2xl rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-dash-border bg-dash-surface">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 !text-dash-textMuted" />
            <Input 
              placeholder="Search members..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 bg-dash-surface border-dash-border text-[12px] focus:ring-dash-accent/20"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
          {filteredMembers.map((member) => (
            <button
              key={member.user_id}
              onClick={() => {
                onToggle(member.user_id);
                // We keep it open for multi-select
              }}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-xl transition-all mb-0.5",
                isAssigned(member.user_id) ? "bg-dash-accent/10" : "hover:bg-dash-surface"
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-7 h-7 border border-dash-border">
                  <AvatarImage src={member.user?.avatar_url} />
                  <AvatarFallback className="text-[10px] bg-dash-border/60">
                    {member.user?.first_name?.[0]}{member.user?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className={cn(
                    "text-[12px] font-bold",
                    isAssigned(member.user_id) ? "text-dash-accent" : "!text-dash-text"
                  )}>
                    {member.user?.first_name} {member.user?.last_name}
                  </span>
                  <span className="text-[10px] !text-dash-textMuted">{member.role}</span>
                </div>
              </div>
              {isAssigned(member.user_id) ? (
                <div className="w-4 h-4 rounded-full bg-dash-accent flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              ) : (
                <Plus className="w-3.5 h-3.5 !text-dash-textMuted" />
              )}
            </button>
          ))}
          {filteredMembers.length === 0 && (
            <div className="p-8 text-center text-[11px] !text-dash-textMuted font-bold tracking-widest">
              No members found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
