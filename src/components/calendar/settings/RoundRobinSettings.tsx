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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Orchestration */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-1 bg-[#2563eb] rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
          <h2 className="text-[14px] font-bold text-[#eef2ff] uppercase tracking-[0.15em] font-space">Team Enrollment</h2>
        </div>
        <p className="text-[11px] text-[#4a5a82] font-medium leading-relaxed max-w-lg">
          Initialize the routing nodes by selecting participating team members and defining their distribution priority weighting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Selection List */}
        <div className="space-y-3">
          <Label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest ml-1 mb-2 block">Available Personnel</Label>
          <div className="bg-[#080f28]/40 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {members.map(member => {
              const isSelected = selectedIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className={cn(
                    "w-full px-5 py-4 flex items-center justify-between transition-all group",
                    isSelected ? "bg-[#2563eb]/5" : "hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] font-space transition-all",
                      isSelected ? "bg-[#2563eb] text-white" : "bg-white/5 text-[#4a5a82] group-hover:bg-white/10"
                    )}>
                      {member.name[0]}
                    </div>
                    <div className="text-left">
                      <p className={cn("text-[13px] font-bold transition-colors", isSelected ? "text-[#eef2ff]" : "text-[#94a3c8]")}>{member.name}</p>
                      <p className="text-[11px] text-[#4a5a82]">{member.email}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                    isSelected ? "bg-[#2563eb] border-[#2563eb]" : "border-white/10"
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
          <Label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest ml-1 block">Distribution Weights</Label>
          {selectedIds.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 px-8 rounded-2xl border border-dashed border-white/5 bg-white/[0.01] text-center opacity-50">
              <Users className="h-8 w-8 text-[#4a5a82] mb-3" />
              <p className="text-[11px] font-bold text-[#4a5a82] uppercase tracking-widest">Enroll team members to configure priority</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedIds.map(id => {
                const member = members.find(m => m.id === id);
                if (!member) return null;
                return (
                  <div key={id} className="p-5 rounded-2xl bg-[#080f28]/60 border border-white/5 space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-[#3b82f6]" />
                        <span className="text-[12px] font-bold text-[#eef2ff] font-dm-sans">{member.name}</span>
                      </div>
                      <span className="text-[14px] font-bold font-space text-[#3b82f6] bg-[#2563eb]/10 px-2 py-0.5 rounded-md">
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
                    <div className="flex justify-between text-[9px] font-bold text-[#4a5a82] uppercase tracking-widest">
                      <span>Low Priority</span>
                      <span>High Performance</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-white/5 flex justify-end">
        <Button
          onClick={() => onSave(selectedIds.map(id => ({ user_id: id, weight: weights[id] })))}
          disabled={selectedIds.length === 0}
          className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white rounded-xl font-bold text-[13px] px-8 h-11 shadow-lg shadow-[#2563eb]/20"
        >
          Confirm Distribution Engine
        </Button>
      </div>
    </div>
  );
}
