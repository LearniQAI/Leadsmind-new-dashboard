'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, Calendar, Video, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import ProfilesTab from './components/ProfilesTab';
import SlotsTab from './components/SlotsTab';
import SessionsTab from './components/SessionsTab';

interface ExpertsClientProps {
  workspaceId: string;
  initialExperts: any[];
  courses: any[];
}

export default function ExpertsClient({ workspaceId, initialExperts, courses }: ExpertsClientProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'profiles' | 'slots' | 'sessions'>('profiles');
  
  // Expert Profiles State
  const [experts, setExperts] = useState<any[]>(initialExperts);
  const [selectedExpert, setSelectedExpert] = useState<any | null>(initialExperts[0] || null);

  const handleCreateExpert = async () => {
    try {
      const { data, error } = await supabase
        .from('lms_expert_profiles')
        .insert({
          workspace_id: workspaceId,
          name: 'New Expert Specialist',
          email: 'specialist@leadsmind.io',
          languages: ['English'],
          specializations: ['Operations'],
          hourly_rate: 100.00,
          currency: 'USD',
          bio: 'Expert consultant profile description.'
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setExperts([...experts, data]);
        setSelectedExpert(data);
        toast.success('Expert profile placeholder created!');
      }
    } catch (err: any) {
      toast.error('Failed to create expert: ' + err.message);
    }
  };

  const handleUpdateExpertLocal = (updatedExpert: any) => {
    setExperts(experts.map(e => e.id === updatedExpert.id ? updatedExpert : e));
    setSelectedExpert(updatedExpert);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Workspace Management</span>
          <h1 className="text-3xl font-space-grotesk font-black uppercase tracking-tighter text-white mt-1.5">
            Subject Matter <span className="text-[#3b82f6]">Experts</span>
          </h1>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">
            Configure calendar availability, languages, session settings, and live classrooms.
          </p>
        </div>
        <Button onClick={handleCreateExpert} className="bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-5 flex items-center gap-1.5 shadow-lg shadow-primary/20">
          <Plus size={14} /> Add Expert
        </Button>
      </div>

      {/* Main Grid Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column - Expert List */}
        <div className="lg:col-span-1 bg-[#080f28]/60 border border-white/5 rounded-3xl p-5 space-y-4">
          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Expert Roster</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {experts.map((e) => (
              <div 
                key={e.id}
                onClick={() => setSelectedExpert(e)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all select-none ${
                  selectedExpert?.id === e.id 
                    ? 'bg-primary/5 border-primary shadow-xl' 
                    : 'bg-[#04091a]/40 border-white/5 hover:bg-[#04091a]/80'
                }`}
              >
                <h4 className="text-xs font-black text-white truncate">{e.name}</h4>
                <p className="text-[10px] text-white/40 truncate font-mono mt-0.5">{e.email}</p>
                <div className="flex gap-1.5 flex-wrap mt-2.5">
                  {(e.specializations || []).slice(0, 2).map((s: string, idx: number) => (
                    <span key={idx} className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Columns - Details Canvas */}
        <div className="lg:col-span-3 space-y-6">
          {selectedExpert ? (
            <div className="bg-[#080f28]/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
              {/* Tab Navigation header */}
              <div className="flex border-b border-white/5 bg-[#04091a]/30 px-6 py-2 gap-4 shrink-0">
                {(['profiles', 'slots', 'sessions'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3.5 border-b-2 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      activeTab === tab 
                        ? 'border-primary text-white' 
                        : 'border-transparent text-white/40 hover:text-white/60'
                    }`}
                  >
                    {tab === 'profiles' && <Users size={12} />}
                    {tab === 'slots' && <Calendar size={12} />}
                    {tab === 'sessions' && <Video size={12} />}
                    {tab === 'profiles' ? 'Profile' : tab === 'slots' ? 'Availability' : 'Sessions'}
                  </button>
                ))}
              </div>

              {/* Tab Content Panel */}
              <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === 'profiles' && (
                  <ProfilesTab 
                    expert={selectedExpert} 
                    onSave={handleUpdateExpertLocal} 
                    supabase={supabase} 
                  />
                )}

                {activeTab === 'slots' && (
                  <SlotsTab 
                    expertId={selectedExpert.id} 
                    supabase={supabase} 
                  />
                )}

                {activeTab === 'sessions' && (
                  <SessionsTab 
                    expertId={selectedExpert.id} 
                    courses={courses} 
                    supabase={supabase} 
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#080f28]/60 border border-white/5 rounded-3xl p-12 text-center py-24 flex flex-col items-center justify-center space-y-4 shadow-xl min-h-[500px]">
              <Users size={32} className="text-white/20" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Expert Specialist</h3>
              <p className="text-xs text-white/40 max-w-xs leading-relaxed">
                Choose an expert advisor from the roster sidebar index on the left to configure availability mappings and session portals.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
