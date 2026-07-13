// @ts-nocheck
'use client';

import React, { useState } from 'react';
import {
  Plus,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Search,
  Filter,
  Users as UsersIcon
} from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';

import { createProject } from '@/app/actions/operations';
import { useRouter } from 'next/navigation';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';

export default function ProjectsClient({ initialProjects }: { initialProjects: any[] }) {
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(false);

  const handleCreate = async () => {
    const name = window.prompt("Enter Project Name:");
    if (!name) return;

    setIsInitializing(true);
    try {
      const res = await createProject(name);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Project node initialized!");
        router.refresh();
      }
    } catch (err) {
      toast.error("Deployment failed");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 motion-reduce:animate-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold !text-dash-text tracking-tight">Project Node Hub</h2>
          <p className="!text-dash-textMuted text-sm font-medium">Orchestrate and track your business initiatives across the workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center bg-white border border-dash-border rounded-xl px-4 py-2">
            <Search className="w-4 h-4 !text-dash-textMuted mr-2" />
            <input
              type="text"
              placeholder="Filter nodes..."
              className="bg-transparent border-none outline-none text-xs !text-dash-text placeholder:text-dash-textMuted w-40 font-bold"
            />
          </div>
          <DashButton onClick={handleCreate} variant="primary" disabled={isInitializing}>
            <Plus size={16} /> New Project
          </DashButton>
        </div>
      </div>

      {initialProjects.length === 0 ? (
        <DashEmptyState
          icon={Briefcase}
          title="Operational silence"
          description="No active project nodes found in this workspace."
          actionLabel="New Project"
          onAction={handleCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {initialProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: any) {
  const progress = project.progress || 0;
  const status = project.status || 'active';

  return (
    <DashCard padding="default" className="group rounded-[32px] relative overflow-hidden flex flex-col hover:border-dash-accent/50">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-dash-surface overflow-hidden">
        <div
          className="h-full bg-dash-accent transition-all duration-1000 ease-out motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between mb-8 mt-2">
        <div className="w-12 h-12 rounded-2xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent group-hover:bg-dash-accent group-hover:text-white transition-colors duration-300 motion-reduce:transition-none">
          <Briefcase size={22} />
        </div>
        <DashStatusPill variant={status === 'active' ? 'success' : 'neutral'}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </DashStatusPill>
      </div>

      <div className="flex-1">
        <h4 className="text-2xl font-bold !text-dash-text tracking-tight mb-2 group-hover:text-dash-accent transition-colors">
          {project.name || project.title || 'Untitled Project'}
        </h4>
        <p className="!text-dash-textMuted text-xs font-medium line-clamp-2 mb-6">
          {project.description || 'No description provided for this initiative.'}
        </p>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold !text-dash-textMuted">Timeline</span>
            <div className="flex items-center gap-2 !text-dash-textMuted text-[11px] font-bold">
              <Calendar size={12} className="text-dash-accent" />
              {new Date(project.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <span className="text-[11px] font-semibold !text-dash-textMuted">Stakeholders</span>
            <div className="flex items-center gap-2 justify-end !text-dash-textMuted text-[11px] font-bold">
              <UsersIcon size={12} className="text-dash-accent" />
              {project.team_size || 1} Team members
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="!text-dash-textMuted">Progress</span>
          <span className="text-dash-accent">{progress}% Complete</span>
        </div>
        <Progress value={progress} className="h-1.5 bg-dash-surface" />
      </div>

      <div className="mt-8 flex items-center gap-3">
        <DashButton variant="secondary" className="flex-1 rounded-2xl h-12 hover:bg-dash-accent hover:text-white">
          Manage Node
        </DashButton>
        <button className="w-12 h-12 rounded-2xl bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted hover:!text-dash-text transition-colors hover:border-dash-text/20">
          <MoreHorizontal size={20} />
        </button>
      </div>
    </DashCard>
  );
}
