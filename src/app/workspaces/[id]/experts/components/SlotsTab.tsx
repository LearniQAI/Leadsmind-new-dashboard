'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SlotsTabProps {
  expertId: string;
  supabase: any;
}

export default function SlotsTab({ expertId, supabase }: SlotsTabProps) {
  const [slots, setSlots] = useState<any[]>([]);
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');
  const [newTimezone, setNewTimezone] = useState('UTC');
  const [loadingSlots, setLoadingSlots] = useState(false);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchSlots();
  }, [expertId]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    try {
      const { data, error } = await supabase
        .from('lms_expert_availabilities')
        .select('*')
        .eq('expert_id', expertId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      if (data) setSlots(data);
    } catch (err: any) {
      toast.error('Failed to load availability slots: ' + err.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleAddSlot = async () => {
    try {
      const { data, error } = await supabase
        .from('lms_expert_availabilities')
        .insert({
          expert_id: expertId,
          day_of_week: newDay,
          start_time: newStart,
          end_time: newEnd,
          timezone: newTimezone
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setSlots([...slots, data].sort((a, b) => a.day_of_week - b.day_of_week));
        toast.success('Availability block added!');
      }
    } catch (err: any) {
      toast.error('Failed to add slot: ' + err.message);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lms_expert_availabilities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSlots(slots.filter(s => s.id !== id));
      toast.success('Slot removed.');
    } catch (err: any) {
      toast.error('Failed to remove slot: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Availability slot form */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end bg-[#04091a]/40 border border-white/5 p-4 rounded-2xl">
        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <label className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Day</label>
          <select 
            value={newDay} 
            onChange={e => setNewDay(parseInt(e.target.value))} 
            className="w-full bg-[#080f28] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
          >
            {daysOfWeek.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Start Time</label>
          <input 
            type="time" 
            value={newStart} 
            onChange={e => setNewStart(e.target.value)} 
            className="w-full bg-[#080f28] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono" 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-bold text-white/40 uppercase tracking-widest">End Time</label>
          <input 
            type="time" 
            value={newEnd} 
            onChange={e => setNewEnd(e.target.value)} 
            className="w-full bg-[#080f28] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono" 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Timezone</label>
          <input 
            type="text" 
            value={newTimezone} 
            onChange={e => setNewTimezone(e.target.value)} 
            className="w-full bg-[#080f28] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono" 
          />
        </div>
        <Button onClick={handleAddSlot} className="bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-9 px-4 flex items-center justify-center gap-1">
          <Plus size={12} /> Add
        </Button>
      </div>

      {/* Canvas Grid display */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Availability Block Rules</h3>
        {loadingSlots ? (
          <p className="text-xs text-white/30 italic">Loading availability blocks...</p>
        ) : slots.length === 0 ? (
          <p className="text-xs text-white/30 italic">No weekly slots configured. This expert will not show in calendars.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {slots.map((s) => (
              <div key={s.id} className="flex justify-between items-center bg-[#04091a]/25 border border-white/5 px-4 py-3.5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock size={14} className="text-primary shrink-0" />
                  <div>
                    <span className="text-xs font-black text-white block">{daysOfWeek[s.day_of_week]}</span>
                    <span className="text-[10px] font-mono text-white/40">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)} ({s.timezone})</span>
                  </div>
                </div>
                <button onClick={() => handleDeleteSlot(s.id)} className="text-red-400 hover:text-red-300 p-1.5">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
