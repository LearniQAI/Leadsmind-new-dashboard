'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Users, Info, ChevronRight, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface RoundRobinSettingsProps {
  members: TeamMember[];
  initialAssignments?: { user_id: string; weight: number }[];
  onSave: (assignments: { user_id: string; weight: number }[]) => void;
}

export function RoundRobinSettings({ members, initialAssignments = [], onSave }: RoundRobinSettingsProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>(initialAssignments.map(a => a.user_id));
  const [weights, setWeights] = React.useState<Record<string, number>>(
    initialAssignments.reduce((acc, curr) => ({ ...acc, [curr.user_id]: curr.weight }), {})
  );

  const toggleMember = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    if (!weights[id]) setWeights(prev => ({ ...prev, [id]: 5 }));
  };

  const handleWeightChange = (id: string, val: number[]) => {
    setWeights(prev => ({ ...prev, [id]: val[0] }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">
      {/* Header Orchestration */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-1 bg-dash-accent rounded-full"></div>
          <h2 className="text-[14px] font-bold !text-dash-text">Team enrollment</h2>
        </div>
        <p className="text-[11px] !text-dash-textMuted font-medium leading-relaxed max-w-lg">
          Initialize the routing nodes by selecting participating team members and defining their distribution priority weighting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Selection List */}
        <div className="space-y-3">
          <Label className="text-[10px] font-bold !text-dash-textMuted ml-1 mb-2 block">Available personnel</Label>
          <div className="bg-white border border-dash-border rounded-2xl overflow-hidden divide-y divide-dash-border shadow-sm">
            {members.map(member => {
              const isSelected = selectedIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className={cn(
                    "w-full px-5 py-4 flex items-center justify-between transition-all motion-reduce:transition-none group",
                    isSelected ? "bg-dash-accent/5" : "hover:bg-dash-surface"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] transition-all motion-reduce:transition-none",
                      isSelected ? "bg-dash-accent text-white" : "bg-dash-surface !text-dash-textMuted group-hover:bg-dash-border/60"
                    )}>
                      {member.name[0]}
                    </div>
                    <div className="text-left">
                      <p className={cn("text-[13px] font-bold transition-colors motion-reduce:transition-none", isSelected ? "!text-dash-text" : "!text-dash-textMuted")}>{member.name}</p>
                      <p className="text-[11px] !text-dash-textMuted">{member.email}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all motion-reduce:transition-none",
                    isSelected ? "bg-dash-accent border-dash-accent" : "border-dash-border"
                  )}>
                    {isSelected && <Target className="h-3 w-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority Weighting Configuration */}
        <div className="space-y-4">
          <Label className="text-[10px] font-bold !text-dash-textMuted ml-1 block">Distribution weights</Label>
          {selectedIds.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 px-8 rounded-2xl border border-dashed border-dash-border bg-dash-surface text-center opacity-70">
              <Users className="h-8 w-8 !text-dash-textMuted mb-3" />
              <p className="text-[11px] font-bold !text-dash-textMuted">Enroll team members to configure priority</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedIds.map(id => {
                const member = members.find(m => m.id === id);
                if (!member) return null;
                return (
                  <div key={id} className="p-5 rounded-2xl bg-white border border-dash-border space-y-4 animate-in zoom-in-95 duration-300 motion-reduce:animate-none shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-dash-accent" />
                        <span className="text-[12px] font-bold !text-dash-text">{member.name}</span>
                      </div>
                      <span className="text-[14px] font-bold text-dash-accent bg-dash-accent/10 px-2 py-0.5 rounded-md">
                        {weights[id] || 5}
                      </span>
                    </div>
                    <Slider
                      value={[weights[id] || 5]}
                      max={10}
                      min={1}
                      step={1}
                      onValueChange={(val) => handleWeightChange(id, val)}
                      className="py-2"
                    />
                    <div className="flex justify-between text-[9px] font-bold !text-dash-textMuted">
                      <span>Low priority</span>
                      <span>High performance</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-dash-border flex justify-end">
        <Button
          onClick={() => onSave(selectedIds.map(id => ({ user_id: id, weight: weights[id] })))}
          disabled={selectedIds.length === 0}
          className="bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl font-bold text-[13px] px-8 h-11 shadow-lg shadow-dash-accent/20 transition-colors motion-reduce:transition-none"
        >
          Confirm distribution engine
        </Button>
      </div>
    </div>
  );
}
