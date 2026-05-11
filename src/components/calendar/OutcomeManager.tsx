'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Zap, Users, Workflow, GitGraph, Save, X } from 'lucide-react';
import { createOutcome } from '@/app/actions/calendar';
import { toast } from 'sonner';

interface Outcome {
 id: string;
 label: string;
 description: string;
 duration_minutes: number;
}

interface OutcomeManagerProps {
 calendarId: string;
 initialOutcomes: Outcome[];
}

export function OutcomeManager({ calendarId, initialOutcomes }: OutcomeManagerProps) {
 const [outcomes, setOutcomes] = useState<Outcome[]>(initialOutcomes);
 const [isAdding, setIsAdding] = useState(false);
 const [newLabel, setNewLabel] = useState('');

 const handleAdd = async () => {
  if (!newLabel) return;
  const res = await createOutcome({ calendarId, label: newLabel });
  if (res.success && res.data) {
   setOutcomes([...outcomes, res.data as any]);
   setNewLabel('');
   setIsAdding(false);
   toast.success('Outcome added successfully');
  } else {
   toast.error('Failed to add outcome');
  }
 };

 return (
  <div className="card__wrapper border-primary/10">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
    <div className="card__title-wrap">
      <div className="flex items-center gap-2 mb-2">
       <Target className="h-4 w-4 text-primary" />
       <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Decision Engine</span>
      </div>
      <h5 className="card__heading-title uppercase">Routing Targets</h5>
      <p className="card__desc style_two text-sm font-medium mt-2">Map meeting goals to automated team workflows.</p>
    </div>
    <Button 
     onClick={() => setIsAdding(true)} 
     className="bg-primary hover:bg-primary-dark text-white rounded-xl gap-2 font-bold uppercase text-[10px] h-12 px-8 shadow-lg shadow-primary/10"
    >
     <Plus className="h-3.5 w-3.5" />
     Add Target
    </Button>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {outcomes.map((outcome) => (
     <div key={outcome.id} className="group p-6 rounded-xl bg-bgBody dark:bg-bgBody-dark border border-border dark:border-border-dark hover:border-primary/40 transition-all duration-500 relative overflow-hidden">
       <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Workflow className="h-10 w-10 text-primary" />
       </div>
       
       <div className="flex items-center justify-between mb-6 relative z-10">
        <span className="text-base font-black text-heading dark:text-heading-dark group-hover:text-primary transition-colors uppercase">{outcome.label}</span>
        <Badge variant="outline" className="bg-primary/5 border-primary/10 text-[9px] font-black text-primary/60 px-3 py-1">{outcome.duration_minutes} MIN</Badge>
       </div>
       
       <div className="flex flex-wrap gap-2 relative z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-[9px] font-black text-body dark:text-body-dark opacity-30 uppercase tracking-[0.2em]">
          <Users className="h-3 w-3" /> Round Robin
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-[0.2em]">
          <GitGraph className="h-3 w-3" /> Pipeline sync
        </div>
       </div>
     </div>
    ))}
    
    {isAdding && (
     <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 animate-in zoom-in duration-500">
       <div className="space-y-6">
        <div className="space-y-2">
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Outcome Label</span>
          <Input 
           autoFocus
           placeholder="e.g. Qualified Sales Lead" 
           className="bg-card dark:bg-card-dark border-border dark:border-border-dark text-heading dark:text-heading-dark h-11 rounded-lg text-sm"
           value={newLabel}
           onChange={(e) => setNewLabel(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Button onClick={handleAdd} className="flex-1 bg-primary text-white rounded-lg h-10 font-bold uppercase text-[10px]">
           <Save className="h-3.5 w-3.5 mr-2" />
           Save Target
          </Button>
          <Button onClick={() => setIsAdding(false)} variant="ghost" className="text-body dark:text-body-dark opacity-30 hover:opacity-100 px-4 font-bold uppercase text-[10px]">
           <X className="h-3.5 w-3.5" />
          </Button>
        </div>
       </div>
     </div>
    )}
   </div>

   {!outcomes.length && !isAdding && (
    <div className="p-16 border border-dashed border-border dark:border-border-dark rounded-xl text-center bg-bgBody/50 dark:bg-bgBody-dark/50">
      <Zap className="h-10 w-10 text-placeholder dark:text-placeholder-dark mx-auto mb-4" />
      <p className="text-[10px] font-black text-placeholder dark:text-placeholder-dark uppercase tracking-[0.4em]">Initialize outcome logic</p>
    </div>
   )}
  </div>
 );
}
