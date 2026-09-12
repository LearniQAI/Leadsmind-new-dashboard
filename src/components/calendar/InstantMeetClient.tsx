'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Video, Copy, Check, ExternalLink, Calendar, Loader2,
  Play, Radio, Sparkles
} from 'lucide-react';
import { createInstantMeeting } from '@/app/actions/calendar/appointments';
import { PremiumSection, GlassContainer } from '@/components/calendar/BookingPrimitives';

interface InstantMeetClientProps {
  workspaceId: string;
  initialAppointments: any[];
}

function isRoomLive(appt: any) {
  if (appt.status !== 'scheduled') return false;
  const now = Date.now();
  const start = new Date(appt.start_time).getTime();
  const end = new Date(appt.end_time).getTime();
  return now >= start && now <= end;
}

function getStatusMeta(appt: any) {
  if (appt.status === 'cancelled') {
    return { label: 'Cancelled', dot: 'bg-danger', text: 'text-danger' };
  }
  if (appt.status === 'no_show') {
    return { label: 'No show', dot: 'bg-warning', text: 'text-warning' };
  }
  if (isRoomLive(appt)) {
    return { label: 'Live now', dot: 'bg-success animate-pulse motion-reduce:animate-none', text: 'text-success' };
  }
  if (appt.status === 'showed_up') {
    return { label: 'Completed', dot: 'bg-dash-textMuted/40', text: '!text-dash-textMuted' };
  }
  return { label: 'Scheduled', dot: 'bg-primary', text: 'text-primary' };
}

export default function InstantMeetClient({
  initialAppointments
}: InstantMeetClientProps) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [appointmentsList, setAppointmentsList] = useState<any[]>(initialAppointments);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMeeting(null);
    setCopied(false);

    try {
      const res = await createInstantMeeting({
        title: title.trim() || 'Instant Meeting',
        durationMinutes: duration,
      });

      if (res.success && res.data) {
        setMeeting(res.data);
        setAppointmentsList(prev => [res.data, ...prev]);
      } else {
        alert(res.error || 'Failed to create instant meeting');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!meeting?.meeting_link) return;
    navigator.clipboard.writeText(meeting.meeting_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 motion-reduce:animate-none">

      {/* Primary column — start a meeting */}
      <div className="lg:col-span-2 space-y-6">

        <PremiumSection
          label="Primary action"
          title="Start an instant meeting"
          description="Launch a private video room immediately. A matching appointment record is created automatically so transcripts and attendance stay in sync."
          accentColor="#1359FF"
        >
          <form onSubmit={handleGenerate} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="title" className="block text-xs font-bold !text-dash-textMuted mb-2">
                  Meeting title
                </label>
                <input
                  type="text"
                  id="title"
                  placeholder="e.g. Quick catchup with client"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-12 bg-dash-surface border border-dash-border rounded-xl px-4 !text-dash-text placeholder:!text-dash-textMuted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all motion-reduce:transition-none text-sm font-medium"
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-xs font-bold !text-dash-textMuted mb-2">
                  Duration
                </label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-12 bg-dash-surface border border-dash-border rounded-xl px-4 !text-dash-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all motion-reduce:transition-none text-sm font-medium appearance-none cursor-pointer"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto h-14 px-10 bg-primary hover:bg-primary/90 text-white font-bold text-xs border-none shadow-lg shadow-primary/20 transition-all motion-reduce:transition-none rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" /> Provisioning video room...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> Generate instant meeting
                </>
              )}
            </Button>
          </form>
        </PremiumSection>

        {/* Result card */}
        {meeting && (
          <GlassContainer glowColor="#16A34A" className="animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none border-success/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold !text-dash-text mb-1">{meeting.title}</h3>
                <div className="flex items-center gap-2 text-xs font-medium !text-dash-textMuted">
                  <Calendar className="w-3.5 h-3.5" />
                  Expires at {new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-success/20 text-success bg-success/10 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse motion-reduce:animate-none" />
                Room active
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold !text-dash-textMuted mb-2">
                  Shareable meeting link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={meeting.meeting_link || ''}
                    className="flex-1 h-12 bg-dash-surface border border-dash-border rounded-xl px-4 !text-dash-text text-xs font-semibold focus:outline-none truncate select-all"
                  />
                  <Button
                    onClick={handleCopy}
                    className="h-12 w-12 bg-dash-surface border border-dash-border hover:bg-dash-border/60 !text-dash-text transition-all motion-reduce:transition-none rounded-xl p-0 flex items-center justify-center flex-shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => window.open(meeting.meeting_link, '_blank')}
                className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold text-xs border-none shadow-lg shadow-primary/20 transition-all motion-reduce:transition-none rounded-xl"
              >
                Join meeting now <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </GlassContainer>
        )}

      </div>

      {/* Secondary column — active rooms lobby */}
      <div className="space-y-6">
        <div className="bg-dash-surface border border-dash-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Play className="w-3.5 h-3.5 text-dash-textMuted" />
            <h3 className="text-xs font-bold !text-dash-textMuted uppercase tracking-wide">Active rooms lobby</h3>
          </div>
          <p className="!text-dash-textMuted text-[11px] font-medium mb-4 leading-relaxed">
            Recent rooms in this workspace.
          </p>

          {appointmentsList.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-dash-border rounded-xl bg-white">
              <Video className="w-6 h-6 !text-dash-textMuted opacity-40 mx-auto mb-3" />
              <p className="!text-dash-text text-xs font-semibold mb-1">No rooms yet</p>
              <p className="!text-dash-textMuted text-[10px]">Generate one to see it here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-dash-border/70">
              {appointmentsList.map(appt => {
                const status = getStatusMeta(appt);
                return (
                  <li key={appt.id} className="py-3 first:pt-0 last:pb-0 group">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="!text-dash-text font-semibold text-xs truncate flex-1">{appt.title}</span>
                      <span className={`flex items-center gap-1.5 text-[9px] font-bold whitespace-nowrap ${status.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] !text-dash-textMuted font-medium">
                        {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {new Date(appt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => window.open(appt.meeting_link || `/meet/${appt.id}`, '_blank')}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity motion-reduce:transition-none motion-reduce:opacity-100"
                      >
                        Launch <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-dash-surface border border-dash-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-3.5 h-3.5 text-dash-textMuted" />
            <h3 className="text-xs font-bold !text-dash-textMuted uppercase tracking-wide">Infrastructure</h3>
          </div>
          <ul className="space-y-2 text-[11px] font-medium !text-dash-textMuted">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success flex-shrink-0" />
              Workspace-isolated rooms with strict access control
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success flex-shrink-0" />
              Live transcription and attendance tracking
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
}
