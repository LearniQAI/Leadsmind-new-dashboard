'use client';

import React, { useState, useEffect } from 'react';
import { getMeetingAnalytics } from '@/app/actions/calendar/appointments';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, TrendingUp, Users, Calendar, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MeetAnalyticsPage() {
  const { id: workspaceId } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      const res = await getMeetingAnalytics();
      if (res.success && res.data) {
        setData(res.data);
      }
      setIsLoading(false);
    }
    loadAnalytics();
  }, [workspaceId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dash-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-dash-accent" size={48} />
      </div>
    );
  }

  const appointments = data?.appointments || [];
  const totalRevenue = data?.totalRevenue || 0;

  // 1. Calculate general stats
  const totalBookings = appointments.length;
  const completed = appointments.filter((a: any) => a.status === 'showed_up' || a.status === 'scheduled').length; // including upcoming as active
  const noShows = appointments.filter((a: any) => a.status === 'no_show').length;
  const cancelled = appointments.filter((a: any) => a.status === 'cancelled').length;

  const noShowRate = totalBookings > 0 ? ((noShows / totalBookings) * 100).toFixed(1) : '0.0';
  const cancelRate = totalBookings > 0 ? ((cancelled / totalBookings) * 100).toFixed(1) : '0.0';

  // 2. Rep Loads calculation
  const repLoads: Record<string, number> = {};
  appointments.forEach((apt: any) => {
    const rep = apt.user_id || 'Primary Admin';
    repLoads[rep] = (repLoads[rep] || 0) + 1;
  });

  // 3. Peak booking hours
  const peakHours: Record<number, number> = {};
  appointments.forEach((apt: any) => {
    if (apt.start_time) {
      const hour = new Date(apt.start_time).getHours();
      peakHours[hour] = (peakHours[hour] || 0) + 1;
    }
  });

  return (
    <main className="min-h-screen bg-dash-bg text-dash-text p-8 font-['Space_Grotesk']">
      <div className="max-w-[1200px] mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-dash-textMuted uppercase tracking-widest font-black">
              <TrendingUp size={14} className="text-dash-accent" />
              <span>Workspace Intelligence</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Meet Analytics Dashboard</h1>
          </div>
          <Button
            onClick={() => router.push(`/workspaces/${workspaceId}/experts`)}
            className="bg-dash-surface border border-dash-border hover:bg-dash-bg text-dash-text rounded-xl flex items-center gap-2 h-10 px-4"
          >
            <ArrowLeft size={16} />
            Back to Roster
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-dash-surface border border-dash-border rounded-3xl space-y-2">
            <div className="flex items-center justify-between text-dash-textMuted">
              <span className="text-xs font-bold uppercase tracking-wider">Total Consultations</span>
              <Calendar size={18} className="text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-dash-text">{totalBookings}</p>
            <p className="text-[10px] text-dash-textMuted">Scheduled & Completed bookings</p>
          </div>

          <div className="p-6 bg-dash-surface border border-dash-border rounded-3xl space-y-2">
            <div className="flex items-center justify-between text-dash-textMuted">
              <span className="text-xs font-bold uppercase tracking-wider">Consultation Revenue</span>
              <span className="text-dash-accent text-xs font-black">ZAR</span>
            </div>
            <p className="text-3xl font-bold text-dash-text">R {totalRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-dash-textMuted">Aggregated PayFast transactions</p>
          </div>

          <div className="p-6 bg-dash-surface border border-dash-border rounded-3xl space-y-2">
            <div className="flex items-center justify-between text-dash-textMuted">
              <span className="text-xs font-bold uppercase tracking-wider">No-Show Ratio</span>
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-amber-600">{noShowRate}%</p>
            <p className="text-[10px] text-dash-textMuted">Total missed appointments: {noShows}</p>
          </div>

          <div className="p-6 bg-dash-surface border border-dash-border rounded-3xl space-y-2">
            <div className="flex items-center justify-between text-dash-textMuted">
              <span className="text-xs font-bold uppercase tracking-wider">Cancellation Ratio</span>
              <AlertTriangle size={18} className="text-rose-600" />
            </div>
            <p className="text-3xl font-bold text-rose-600">{cancelRate}%</p>
            <p className="text-[10px] text-dash-textMuted">Total cancelled: {cancelled}</p>
          </div>
        </div>

        {/* Dynamic Detail Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Team Meeting Loads */}
          <div className="p-6 bg-dash-surface border border-dash-border rounded-3xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-dash-border">
              <h3 className="text-lg font-bold text-dash-text">Rep Meeting Workloads</h3>
              <Users size={16} className="text-dash-textMuted" />
            </div>
            <div className="space-y-4">
              {Object.keys(repLoads).length === 0 ? (
                <p className="text-xs text-dash-textMuted">No appointments recorded yet.</p>
              ) : (
                Object.entries(repLoads).map(([rep, count]) => (
                  <div key={rep} className="flex items-center justify-between p-3 bg-dash-bg border border-dash-border rounded-xl">
                    <span className="text-xs font-bold text-dash-text">{rep.substring(0, 36)}</span>
                    <span className="text-xs font-black px-2.5 py-1 bg-blue-100 text-blue-600 rounded-lg border border-blue-200">
                      {count} Meetings
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Peak Booking Times */}
          <div className="p-6 bg-dash-surface border border-dash-border rounded-3xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-dash-border">
              <h3 className="text-lg font-bold text-dash-text">Peak Scheduling Hours</h3>
              <Calendar size={16} className="text-dash-textMuted" />
            </div>
            <div className="space-y-3">
              {Object.keys(peakHours).length === 0 ? (
                <p className="text-xs text-dash-textMuted">No peak slots logged.</p>
              ) : (
                Object.entries(peakHours).map(([hour, count]) => {
                  const hourNum = parseInt(hour);
                  const displayHour = hourNum === 12 ? '12:00 PM' : hourNum === 0 ? '12:00 AM' : hourNum > 12 ? `${hourNum - 12}:00 PM` : `${hourNum}:00 AM`;
                  return (
                    <div key={hour} className="space-y-1">
                      <div className="flex justify-between text-[11px] text-dash-textMuted">
                        <span>{displayHour}</span>
                        <span>{count} Bookings</span>
                      </div>
                      <div className="w-full bg-dash-border h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{ width: `${Math.min(100, (count / totalBookings) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
