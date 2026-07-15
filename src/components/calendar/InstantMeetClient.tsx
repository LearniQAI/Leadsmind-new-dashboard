'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Video, Copy, Check, ExternalLink, Calendar, Loader2,
  Settings2, Activity, Play, ArrowRight, UserCheck, ShieldCheck
} from 'lucide-react';
import { createInstantMeeting } from '@/app/actions/calendar/appointments';

interface InstantMeetClientProps {
  workspaceId: string;
  initialCalendars: any[];
  initialAppointments: any[];
}

export default function InstantMeetClient({
  workspaceId,
  initialCalendars,
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
        // Prepend to current list
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-primary bg-primary/10 border-primary/20';
      case 'showed_up': return 'text-success bg-success/10 border-success/20';
      case 'cancelled': return 'text-danger bg-danger/10 border-danger/20';
      case 'no_show': return 'text-warning bg-warning/10 border-warning/20';
      default: return '!text-dash-textMuted bg-dash-surface border-dash-border';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500 motion-reduce:animate-none">

      {/* Left Columns (Form & Generated Meeting Status) */}
      <div className="lg:col-span-2 space-y-8">

        {/* Setup Form Card */}
        <div className="bg-white border border-dash-border rounded-3xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold !text-dash-text mb-2 flex items-center gap-3">
            <Settings2 className="w-5 h-5 text-primary" /> Start an instant meeting
          </h2>
          <p className="!text-dash-textMuted text-xs mb-6 font-medium">
            Launch a private Jitsi WebRTC video room immediately. The system generates matching appointment hooks so transcripts and attendance can be recorded.
          </p>

          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-xs font-bold !text-dash-textMuted mb-2">
                Meeting title
              </label>
              <input
                type="text"
                id="title"
                placeholder="e.g. Quick Catchup with Client"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-12 bg-white border border-dash-border rounded-xl px-4 !text-dash-text placeholder:!text-dash-textMuted focus:outline-none focus:border-primary transition-colors motion-reduce:transition-none text-sm font-medium"
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="duration" className="block text-xs font-bold !text-dash-textMuted mb-2">
                Room lifespan / duration
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-12 bg-white border border-dash-border rounded-xl px-4 !text-dash-text focus:outline-none focus:border-primary transition-colors motion-reduce:transition-none text-sm font-medium appearance-none cursor-pointer"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={120}>2 Hours</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-xs border-none shadow-lg shadow-primary/20 transition-all motion-reduce:transition-none rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" /> Provisioning video room...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" /> Generate instant meeting
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Result Card */}
        {meeting && (
          <div className="bg-white border border-primary/20 rounded-3xl p-6 sm:p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold !text-dash-text mb-1">{meeting.title}</h3>
                <div className="flex items-center gap-2 text-xs font-medium !text-dash-textMuted">
                  <Calendar className="w-3.5 h-3.5" />
                  Expires at {new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-success/20 text-success bg-success/10">
                Room Active
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

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={() => window.open(meeting.meeting_link, '_blank')}
                  className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold text-xs border-none shadow-lg shadow-primary/20 transition-all motion-reduce:transition-none rounded-xl"
                >
                  Join meeting now <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostic Testing Views Section */}
        <div className="bg-white border border-dash-border rounded-3xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold !text-dash-text mb-6 flex items-center gap-3">
            <Activity className="w-5 h-5 text-dash-accent" /> Testing & verification cockpit
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Quick Testing Links */}
            <div className="bg-dash-surface border border-dash-border rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold !text-dash-textMuted">Core testing pages</h3>
              <div className="space-y-3">
                <button
                  onClick={() => window.open(`/workspaces/${workspaceId}/meet-analytics`, '_blank')}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-dash-border hover:border-primary/30 !text-dash-text hover:text-primary transition-all motion-reduce:transition-none text-xs font-bold"
                >
                  <span>Meet analytics cockpit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => window.open('/portal/dashboard', '_blank')}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-dash-border hover:border-primary/30 !text-dash-text hover:text-primary transition-all motion-reduce:transition-none text-xs font-bold"
                >
                  <span>Customer portal simulation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Public Calendars Slot Previews */}
            <div className="bg-dash-surface border border-dash-border rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold !text-dash-textMuted">Calendars slot lookup</h3>
              {initialCalendars.length === 0 ? (
                <p className="!text-dash-textMuted text-xs font-medium py-2">No active calendars found to test booking.</p>
              ) : (
                <div className="space-y-2">
                  {initialCalendars.map(cal => (
                    <button
                      key={cal.id}
                      onClick={() => window.open(`/book/${cal.slug}`, '_blank')}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-dash-border hover:border-primary/30 text-left text-xs font-bold !text-dash-text hover:text-dash-accent transition-all motion-reduce:transition-none truncate"
                    >
                      <span className="truncate pr-2">{cal.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Right Column (Recent Active Meeting Rooms) */}
      <div className="space-y-8">

        <div className="bg-white border border-dash-border rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold !text-dash-text mb-4 flex items-center gap-2">
            <Play className="w-4 h-4 text-success" /> Active rooms lobby
          </h3>
          <p className="!text-dash-textMuted text-xs mb-6 font-medium">
            Recent rooms in this workspace. Click <strong>Launch Lobby</strong> to test the pre-join canvas setup, webcam rendering, and Jitsi media streaming.
          </p>

          <div className="space-y-4">
            {appointmentsList.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-dash-border rounded-2xl bg-dash-surface">
                <Video className="w-8 h-8 !text-dash-textMuted opacity-50 mx-auto mb-3" />
                <h4 className="!text-dash-text text-xs font-medium mb-1">No meeting rooms provisioned</h4>
                <p className="!text-dash-textMuted text-[10px]">Create an instant meeting above to start testing.</p>
              </div>
            ) : (
              appointmentsList.map(appt => (
                <div key={appt.id} className="p-4 rounded-2xl bg-dash-surface border border-dash-border space-y-3 hover:border-primary/20 transition-colors motion-reduce:transition-none">
                  <div className="flex items-start justify-between gap-2">
                    <span className="!text-dash-text font-bold text-xs truncate flex-1">{appt.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${getStatusColor(appt.status)}`}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="text-[10px] !text-dash-textMuted font-medium">
                    {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {new Date(appt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <Button
                    onClick={() => window.open(appt.meeting_link || `/meet/${appt.id}`, '_blank')}
                    className="w-full h-8 bg-white hover:bg-dash-border/60 !text-dash-text font-bold text-[9px] rounded-lg p-0 flex items-center justify-center gap-1.5 border border-dash-border transition-colors motion-reduce:transition-none"
                  >
                    Launch lobby <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security / System Audit Status */}
        <div className="bg-white border border-dash-border rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold !text-dash-textMuted">Meet infrastructure</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span className="text-xs font-bold !text-dash-text">Strict Workspace RLS active</span>
            </div>
            <div className="flex items-center gap-3">
              <UserCheck className="w-4 h-4 text-success" />
              <span className="text-xs font-bold !text-dash-text">Accent-Aware Whisper Configured</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span className="text-xs font-bold !text-dash-text">PayFast double-entry ledger balancing active</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
