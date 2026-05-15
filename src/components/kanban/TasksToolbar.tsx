'use client';

import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Plus, ListFilter, LayoutGrid, Calendar as CalendarIcon,
  User, CheckCircle2, Circle, ArrowUpDown, ChevronDown, Clock, AlertCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getAssignableMembers } from '@/app/actions/tasks';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TasksToolbarProps {
  view: 'kanban' | 'list' | 'calendar';
  onViewChange: (view: 'kanban' | 'list' | 'calendar') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'newest' | 'priority' | 'due_date';
  onSortChange: (sort: 'newest' | 'priority' | 'due_date') => void;
  onMyTasksToggle: (active: boolean) => void;
  selectedAssignees: string[];
  onAssigneeToggle: (userId: string) => void;
  onInitializeTask: () => void;
  dueTodayOnly: boolean;
  onDueTodayToggle: (active: boolean) => void;
  highPriorityOnly: boolean;
  onHighPriorityToggle: (active: boolean) => void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'NEWEST FIRST' },
  { value: 'priority', label: 'HIGHEST PRIORITY' },
  { value: 'due_date', label: 'SOONEST DEADLINE' },
];

export function TasksToolbar({
  view,
  onViewChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onMyTasksToggle,
  selectedAssignees,
  onAssigneeToggle,
  onInitializeTask,
  dueTodayOnly,
  onDueTodayToggle,
  highPriorityOnly,
  onHighPriorityToggle
}: TasksToolbarProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [myTasksActive, setMyTasksActive] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    const res = await getAssignableMembers();
    if (res.data) setMembers(res.data);
  }

  const handleMyTasks = () => {
    const newState = !myTasksActive;
    setMyTasksActive(newState);
    onMyTasksToggle(newState);
  };

  return (
    <div className="flex flex-col gap-4 mb-6 px-6 shrink-0">
      {/* Primary Row: Search & Global Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-center gap-3 flex-1 max-w-5xl">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="text"
              placeholder="SEARCH OBJECTIVES, ASSETS, OR PERSONNEL..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 bg-white/[0.03] border border-white/5 rounded-lg py-1.5 pl-9 pr-4 text-[11px] font-bold text-white placeholder:text-white/10 focus:outline-none focus:border-primary/40 transition-all uppercase tracking-wider font-space-grotesk"
            />
          </div>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 h-9 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all shrink-0">
                <ArrowUpDown className="w-3 h-3" />
                <span>SORT: {SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                <ChevronDown className="w-3 h-3 opacity-20" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#0B132C] border-white/10 rounded-xl min-w-[180px] z-[1500]">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onSortChange(option.value as any)}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest py-2.5 px-4 focus:bg-primary/20 focus:text-white transition-colors cursor-pointer font-space-grotesk",
                    sortBy === option.value ? "text-primary" : "text-white/40"
                  )}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Toggle (Segmented) */}
          <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/5 shrink-0">
            <ViewButton
              active={view === 'kanban'}
              onClick={() => onViewChange('kanban')}
              icon={<LayoutGrid className="w-3.5 h-3.5" />}
              label="Kanban"
            />
            <ViewButton
              active={view === 'list'}
              onClick={() => onViewChange('list')}
              icon={<ListFilter className="w-3.5 h-3.5" />}
              label="List"
            />
            <ViewButton
              active={view === 'calendar'}
              onClick={() => onViewChange('calendar')}
              icon={<CalendarIcon className="w-3.5 h-3.5" />}
              label="Calendar"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onInitializeTask && (
            <button
              onClick={onInitializeTask}
              className="flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>NEW TASK</span>
            </button>
          )}
        </div>
      </div>

      {/* Secondary Row: Filters & Assignees */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-3 border-t border-white/5">
        <div className="flex flex-wrap items-center gap-6">
          {/* My Tasks Toggle */}
          <button
            onClick={() => onDueTodayToggle(!dueTodayOnly)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border",
              dueTodayOnly
                ? "bg-accent/10 border-accent/20 text-accent"
                : "bg-white/5 border-white/5 text-white/30 hover:text-white/50"
            )}
          >
            <Clock className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] font-space-grotesk">DUE TODAY</span>
          </button>

          <button
            onClick={() => onHighPriorityToggle(!highPriorityOnly)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border",
              highPriorityOnly
                ? "bg-red/10 border-red/20 text-red"
                : "bg-white/5 border-white/5 text-white/30 hover:text-white/50"
            )}
          >
            <AlertCircle className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] font-space-grotesk">HIGH PRIORITY</span>
          </button>

          <div className="w-[1px] h-4 bg-white/5 hidden md:block" />

          {/* Personnel Hub */}
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/10 font-space-grotesk">Personnel:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[300px] xl:max-w-md py-1">
              <button
                onClick={() => {
                  onMyTasksToggle(false);
                  members.forEach(m => {
                    if (selectedAssignees.includes(m.user_id)) onAssigneeToggle(m.user_id);
                  });
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                  selectedAssignees.length === 0 && !myTasksActive
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-white/5 border-white/5 text-white/30 hover:text-white/50"
                )}
              >
                All
              </button>

              {members.map((member) => {
                const isSelected = selectedAssignees.includes(member.user_id);
                return (
                  <button
                    key={member.user_id}
                    onClick={() => onAssigneeToggle(member.user_id)}
                    className={cn(
                      "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all shrink-0",
                      isSelected
                        ? "bg-primary/10 border-primary/20 text-primary shadow-lg shadow-primary/10"
                        : "bg-white/[0.03] border-white/5 text-white/30 hover:bg-white/5"
                    )}
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={member.user?.avatar_url} />
                      <AvatarFallback className="text-[7px] bg-white/10">{member.user?.first_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-[9px] font-bold uppercase tracking-widest">{member.user?.first_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[9px] font-bold text-white/10 uppercase tracking-[0.2em] font-space-grotesk">
            Showing {selectedAssignees.length > 0 || searchQuery ? 'Tactical' : 'Global'} View
          </span>
          <button className="flex items-center gap-2 text-white/10 hover:text-white/40 transition-colors">
            <Filter className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest font-space-grotesk">Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
        active
          ? "bg-primary text-white shadow-lg"
          : "text-white/20 hover:text-white/50"
      )}
    >
      {icon}
      <span className={cn(active ? "block" : "hidden lg:block")}>{label.toUpperCase()}</span>
    </button>
  );
}
