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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';

import { createProject } from '@/app/actions/operations';
import { useRouter } from 'next/navigation';

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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic-none">Project Node Hub</h2>
          <p className="text-white/40 text-sm font-medium italic-none">Orchestrate and track your business initiatives across the workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2">
            <Search className="w-4 h-4 text-white/20 mr-2" />
            <input 
              type="text" 
              placeholder="Filter nodes..." 
              className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-40 font-bold"
            />
          </div>
          <Button 
            onClick={handleCreate}
            className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus size={16} /> New Project
          </Button>
        </div>
      </div>

      {initialProjects.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center text-center bg-[#0b0b1a] border-2 border-dashed border-white/10 rounded-[40px] group">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/10">
            <Briefcase size={32} className="text-white/20" />
          </div>
          <h3 className="text-xl font-black text-white/40 uppercase tracking-widest italic-none">Operational Silence</h3>
          <p className="text-white/20 text-xs font-bold mt-2 uppercase tracking-widest italic-none">No active project nodes found in this workspace.</p>
        </div>
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
  
  return (
    <div className="bg-[#0b0b1a] border border-white/10 rounded-[40px] p-8 group hover:border-primary/50 transition-all duration-500 shadow-2xl relative overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5 overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-1000 ease-out" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      <div className="flex items-center justify-between mb-8 mt-2">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
          <Briefcase size={22} />
        </div>
        <Badge className={`bg-white/5 border-none text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
          project.status === 'active' ? 'text-success' : 'text-white/40'
        }`}>
          {project.status || 'Active'}
        </Badge>
      </div>

      <div className="flex-1">
        <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 group-hover:text-primary transition-colors italic-none">
          {project.name || project.title || 'Untitled Project'}
        </h4>
        <p className="text-white/40 text-xs font-medium line-clamp-2 mb-6 italic-none">
          {project.description || 'No description provided for this neural initiative.'}
        </p>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-1">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic-none">Timeline</span>
            <div className="flex items-center gap-2 text-white/60 text-[10px] font-bold italic-none">
              <Calendar size={12} className="text-primary" />
              {new Date(project.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic-none">Stakeholders</span>
            <div className="flex items-center gap-2 justify-end text-white/60 text-[10px] font-bold italic-none">
              <UsersIcon size={12} className="text-primary" />
              {project.team_size || 1} Neural Units
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest italic-none">
          <span className="text-white/40">Neural Progress</span>
          <span className="text-primary">{progress}% Complete</span>
        </div>
        <Progress value={progress} className="h-1.5 bg-white/5" />
      </div>

      <div className="mt-8 flex items-center gap-3">
        <Button className="flex-1 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest h-12 hover:bg-primary transition-all">
          Manage Node
        </Button>
        <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 hover:text-white transition-colors hover:border-white/20">
          <MoreHorizontal size={20} />
        </button>
      </div>
    </div>
  );
}
