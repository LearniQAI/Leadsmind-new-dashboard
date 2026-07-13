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
  { value: 'newest', label: 'Newest first' },
  { value: 'priority', label: 'Highest priority' },
  { value: 'due_date', label: 'Soonest deadline' },
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 !text-dash-textMuted" />
            <input
              type="text"
              placeholder="Search objectives, assets, or personnel..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 bg-dash-surface border border-dash-border rounded-lg py-1.5 pl-9 pr-4 text-[12px] font-semibold !text-dash-text placeholder:!text-dash-textMuted focus:outline-none focus:border-dash-accent/40 transition-colors"
            />
          </div>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 h-9 rounded-lg bg-dash-surface border border-dash-border text-[11px] font-semibold !text-dash-textMuted hover:!text-dash-text transition-colors shrink-0">
                <ArrowUpDown className="w-3 h-3" />
                <span>Sort: {SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                <ChevronDown className="w-3 h-3 opacity-40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-dash-border rounded-xl min-w-[180px] z-[1500]">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onSortChange(option.value as any)}
                  className={cn(
                    "text-[12px] font-semibold py-2.5 px-4 focus:bg-dash-accent/20 focus:!text-dash-text transition-colors cursor-pointer",
                    sortBy === option.value ? "text-dash-accent" : "!text-dash-textMuted"
                  )}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Toggle (Segmented) */}
          <div className="flex items-center bg-dash-surface p-1 rounded-lg border border-dash-border shrink-0">
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
              className="flex items-center gap-2 px-4 h-9 rounded-lg bg-dash-accent text-white text-[12px] font-bold shadow-lg shadow-dash-accent/20 hover:bg-dash-accent/90 transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>New task</span>
            </button>
          )}
        </div>
      </div>

      {/* Secondary Row: Filters & Assignees */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-3 border-t border-dash-border">
        <div className="flex flex-wrap items-center gap-6">
          {/* My Tasks Toggle */}
          <button
            onClick={() => onDueTodayToggle(!dueTodayOnly)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none border",
              dueTodayOnly
                ? "bg-dash-accent/10 border-dash-accent/20 text-dash-accent"
                : "bg-dash-surface border-dash-border !text-dash-textMuted hover:!text-dash-text"
            )}
          >
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-bold">Due today</span>
          </button>

          <button
            onClick={() => onHighPriorityToggle(!highPriorityOnly)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none border",
              highPriorityOnly
                ? "bg-red/10 border-red/20 text-red"
                : "bg-dash-surface border-dash-border !text-dash-textMuted hover:!text-dash-text"
            )}
          >
            <AlertCircle className="w-3 h-3" />
            <span className="text-[11px] font-bold">High priority</span>
          </button>

          <div className="w-[1px] h-4 bg-dash-border hidden md:block" />

          {/* Personnel Hub */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold !text-dash-textMuted">Personnel:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[300px] xl:max-w-md py-1">
              <button
                onClick={() => {
                  onMyTasksToggle(false);
                  members.forEach(m => {
                    if (selectedAssignees.includes(m.user_id)) onAssigneeToggle(m.user_id);
                  });
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors motion-reduce:transition-none border",
                  selectedAssignees.length === 0 && !myTasksActive
                    ? "bg-dash-accent/10 border-dash-accent/20 text-dash-accent"
                    : "bg-dash-surface border-dash-border !text-dash-textMuted hover:!text-dash-text"
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
                      "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-colors motion-reduce:transition-none shrink-0",
                      isSelected
                        ? "bg-dash-accent/10 border-dash-accent/20 text-dash-accent shadow-[0_4px_12px_rgba(19,89,255,0.1)]"
                        : "bg-dash-surface border-dash-border !text-dash-textMuted hover:bg-dash-border/60"
                    )}
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={member.user?.avatar_url} />
                      <AvatarFallback className="text-[7px] bg-dash-border/60">{member.user?.first_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] font-bold">{member.user?.first_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[11px] font-semibold !text-dash-textMuted">
            Showing {selectedAssignees.length > 0 || searchQuery ? 'Tactical' : 'Global'} view
          </span>
          <button className="flex items-center gap-2 !text-dash-textMuted hover:!text-dash-text transition-colors">
            <Filter className="w-3 h-3" />
            <span className="text-[11px] font-bold">Filters</span>
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
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors motion-reduce:transition-none",
        active
          ? "bg-dash-accent text-white shadow-sm"
          : "!text-dash-textMuted hover:!text-dash-text"
      )}
    >
      {icon}
      <span className={cn(active ? "block" : "hidden lg:block")}>{label}</span>
    </button>
  );
}
