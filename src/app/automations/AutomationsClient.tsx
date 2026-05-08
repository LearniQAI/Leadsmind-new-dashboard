'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Zap, Play, Pause, MoreVertical, GitBranch, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AutomationsClient({ initialWorkflows }: { initialWorkflows: any[] }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white italic leading-none">Workflow <span className="text-primary">Engine</span></h1>
          <p className="text-white/40 text-sm font-medium mt-2 italic">Scale your business with high-frequency neural automations.</p>
        </div>
        <Button className="bg-primary hover:bg-primary-dark text-white font-black uppercase italic tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xxl:grid-cols-3 gap-6">
        {initialWorkflows.length === 0 ? (
          <div className="col-span-full py-20 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/10">
              <Zap className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-lg font-black uppercase text-white/40 tracking-widest">No Active Workflows</h3>
            <p className="text-white/20 text-[10px] font-bold mt-2 uppercase tracking-widest">Initialize your first neural automation node</p>
          </div>
        ) : (
          initialWorkflows.map(workflow => (
            <div key={workflow.id} className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-6 group hover:border-primary/50 transition-all duration-500 shadow-xl shadow-black/40">
              <div className="flex justify-between items-start mb-6">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${workflow.is_active ? 'bg-primary/10 text-primary border-primary/20 group-hover:bg-primary group-hover:text-white' : 'bg-white/5 text-white/20 border-white/10'}`}>
                  <Zap size={20} className={workflow.is_active ? 'animate-pulse' : ''} />
                </div>
                <div className="flex gap-2">
                  <Badge className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none ${workflow.is_active ? 'bg-success/10 text-success' : 'bg-white/10 text-white/40'}`}>
                    {workflow.is_active ? 'Operational' : 'Hibernating'}
                  </Badge>
                  <button className="text-white/20 hover:text-white"><MoreVertical size={16} /></button>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1 group-hover:text-primary transition-colors">{workflow.name}</h4>
                <div className="flex items-center gap-2 text-white/30 text-[10px] font-bold tracking-widest uppercase">
                  <GitBranch className="w-3.5 h-3.5 text-primary" />
                  <span>{workflow.steps?.[0]?.count || 0} Logic Steps</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex gap-2">
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Trigger: <span className="text-white/60 italic">{workflow.trigger_type}</span></span>
                </div>
                <div className="flex gap-2">
                   <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl bg-white/5 text-white/30 hover:text-white transition-all">
                     {workflow.is_active ? <Pause size={14} /> : <Play size={14} />}
                   </Button>
                   <Button className="h-10 px-5 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase italic text-[9px] tracking-widest hover:bg-primary transition-all flex items-center gap-2">
                     Design <Share2 size={12} />
                   </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
