'use client';

import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Check, X } from 'lucide-react';
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
        <button className="flex items-center gap-2 p-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-primary/40 transition-all group">
          <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 group-hover:text-primary transition-colors">
            <UserPlus className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white/40 group-hover:text-white/60 pr-2">Assign Team</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0 bg-[#0c1535] border-white/10 shadow-2xl rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-white/5 bg-white/[0.02]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <Input 
              placeholder="Search members..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 bg-white/5 border-white/5 text-[12px] focus:ring-primary/20"
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
                isAssigned(member.user_id) ? "bg-primary/10" : "hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-7 h-7 border border-white/5">
                  <AvatarImage src={member.user?.avatar_url} />
                  <AvatarFallback className="text-[10px] bg-white/10">
                    {member.user?.first_name?.[0]}{member.user?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className={cn(
                    "text-[12px] font-bold",
                    isAssigned(member.user_id) ? "text-primary" : "text-white/90"
                  )}>
                    {member.user?.first_name} {member.user?.last_name}
                  </span>
                  <span className="text-[10px] text-white/20">{member.role}</span>
                </div>
              </div>
              {isAssigned(member.user_id) ? (
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              ) : (
                <Plus className="w-3.5 h-3.5 text-white/10" />
              )}
            </button>
          ))}
          {filteredMembers.length === 0 && (
            <div className="p-8 text-center text-[11px] text-white/20 font-bold uppercase tracking-widest">
              No members found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2.75C8 2.47386 7.77614 2.25 7.5 2.25C7.22386 2.25 7 2.47386 7 2.75V7H2.75C2.47386 7 2.25 7.22386 2.25 7.5C2.25 7.77614 2.47386 8 2.75 8H7V12.25C7 12.5261 7.22386 12.75 7.5 12.75C7.77614 12.75 8 12.5261 8 12.25V8H12.25C12.5261 8 12.75 7.77614 12.75 7.5C12.75 7.22386 12.5261 7 12.25 7H8V2.75Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
);
