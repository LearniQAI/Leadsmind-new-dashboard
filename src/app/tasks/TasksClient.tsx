'use client';

import React, { useState } from 'react';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { TasksBoard } from '@/components/kanban/TasksBoard';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { cn } from '@/lib/utils';

export default function TasksClient({ initialTasks }: { initialTasks: any[] }) {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  return (
    <MetaData pageTitle="Tasks Board">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[#0B132C]">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-6 pt-2">
            <div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2 font-space-grotesk">
                Task <span className="text-primary">Pipeline</span>
              </h1>
              <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.3em] font-space-grotesk">
                Workflow Orchestration & Milestone Tracking
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setView('kanban')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    view === 'kanban' ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white/60"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Kanban
                </button>
                <button
                  onClick={() => setView('list')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    view === 'list' ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white/60"
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                  List View
                </button>
              </div>
            </div>
          </div>

          {/* Board Content */}
          <div className="flex-1 overflow-hidden">
            {view === 'kanban' ? (
              <TasksBoard />
            ) : (
              <div className="flex items-center justify-center h-full text-white/20 uppercase tracking-widest font-black text-sm">
                List View Implementation Coming Soon
              </div>
            )}
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
