'use client';

import React, { useState, useEffect } from 'react';
import { Video, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SessionDetailsModal from './SessionDetailsModal';

interface SessionsTabProps {
  expertId: string;
  courses: any[];
  supabase: any;
}

export default function SessionsTab({ expertId, courses, supabase }: SessionsTabProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [sessionType, setSessionType] = useState<'private' | 'group' | 'cohort' | 'drop_in'>('drop_in');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // Modal State
  const [selectedSessionDetails, setSelectedSessionDetails] = useState<any | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [expertId]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('lms_expert_sessions')
        .select('*')
        .eq('expert_id', expertId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setSessions(data);
    } catch (err: any) {
      toast.error('Failed to load expert sessions: ' + err.message);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleAddSession = async () => {
    if (!selectedCourseId) {
      toast.error('Select a valid course.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lms_expert_sessions')
        .insert({
          expert_id: expertId,
          course_id: selectedCourseId,
          session_type: sessionType,
          meeting_url: meetingUrl,
          is_live: isLive,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setSessions([data, ...sessions]);
        setMeetingUrl('');
        toast.success('SME Session published!');
      }
    } catch (err: any) {
      toast.error('Failed to add session: ' + err.message);
    }
  };

  const handleToggleSessionLive = async (session: any) => {
    const nextLive = !session.is_live;
    try {
      const { error } = await supabase
        .from('lms_expert_sessions')
        .update({ is_live: nextLive })
        .eq('id', session.id);

      if (error) throw error;
      
      setSessions(sessions.map(s => s.id === session.id ? { ...s, is_live: nextLive } : s));
      toast.success(nextLive ? 'Session is now LIVE! Students alerted.' : 'Session ended.');
    } catch (err: any) {
      toast.error('Failed to update live status: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add session card */}
      <div className="bg-[#04091a]/40 border border-white/5 p-4 rounded-2xl space-y-4">
        <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest border-b border-white/5 pb-1.5">Launch New Live Session Panel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Select Target Course</label>
            <select 
              value={selectedCourseId} 
              onChange={e => setSelectedCourseId(e.target.value)} 
              className="w-full bg-[#080f28] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
            >
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Session Type</label>
            <select 
              value={sessionType} 
              onChange={e => setSessionType(e.target.value as any)} 
              className="w-full bg-[#080f28] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
            >
              <option value="private">Private (1-on-1)</option>
              <option value="group">Collaborative Group</option>
              <option value="cohort">Cohorted Live Class</option>
              <option value="drop_in">Open Drop-in Window</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Meeting Call URL</label>
            <input 
              type="text" 
              value={meetingUrl} 
              onChange={e => setMeetingUrl(e.target.value)} 
              placeholder="e.g. https://meet.jit.si/my-room" 
              className="w-full bg-[#080f28] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" 
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5 font-body">
          <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={isLive} 
              onChange={e => setIsLive(e.target.checked)} 
              className="accent-primary rounded h-4 w-4" 
            />
            <span className="uppercase text-[9px] font-bold tracking-wider">Initiate live immediately (Pulsing green status for students)</span>
          </label>
          <Button onClick={handleAddSession} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-10 px-5">
            Publish Session
          </Button>
        </div>
      </div>

      {/* Active Sessions list */}
      <div className="space-y-3 font-body">
        <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active & Past Sessions</h3>
        {loadingSessions ? (
          <p className="text-xs text-white/30 italic">Loading active sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-white/30 italic">No schedules or active live classrooms found.</p>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((s) => (
              <div key={s.id} className="flex justify-between items-center bg-[#04091a]/25 border border-white/5 px-4 py-3.5 rounded-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white capitalize">{s.session_type.replace('_', ' ')}</span>
                    {s.is_live && (
                      <span className="flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Now
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-white/40 block max-w-sm truncate">{s.meeting_url}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setSelectedSessionDetails(s)}
                    className="text-[9px] font-black uppercase tracking-wider rounded-lg h-8 px-3 bg-white/5 border border-white/5 text-white hover:bg-white/10"
                  >
                    View Details
                  </Button>
                  <Button 
                    onClick={() => handleToggleSessionLive(s)}
                    className={`text-[9px] font-black uppercase tracking-wider rounded-lg h-8 px-3 border ${
                      s.is_live
                        ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {s.is_live ? 'End Live Session' : 'Make Live Now'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSessionDetails && (
        <SessionDetailsModal
          session={selectedSessionDetails}
          onClose={() => {
            setSelectedSessionDetails(null);
            fetchSessions();
          }}
          supabase={supabase}
        />
      )}
    </div>
  );
}
