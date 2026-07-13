import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getWatchlists, getAlerts } from '@/app/actions/watchlist-workspace';
import { WatchlistManager } from '@/components/lead-finder/WatchlistManager';
import { AlertCenter } from '@/components/lead-finder/AlertCenter';
import { Eye, ShieldAlert, Activity } from 'lucide-react';
import Link from 'next/link';

export default async function WatchlistDashboardPage() {
  const [watchlistsRes, alertsRes] = await Promise.all([
    getWatchlists(),
    getAlerts()
  ]);

  if (!watchlistsRes.success || !alertsRes.success) {
    return (
      <Wrapper>
        <div className="p-12 text-center !text-dash-textMuted">Error loading watchlist dashboard.</div>
      </Wrapper>
    );
  }

  const watchlists = watchlistsRes.data || [];
  const alerts = alertsRes.data || [];

  const unreadCount = alerts.filter((a: any) => !a.is_read).length;
  const highPriorityCount = alerts.filter((a: any) => !a.is_read && a.priority === 'High').length;

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black !text-dash-text mb-2 flex items-center gap-3">
            <Eye className="text-dash-accent" size={32} /> Proactive Monitoring
          </h1>
          <p className="!text-dash-textMuted">Monitor market changes, configure automated alerts, and track opportunity spikes in real-time.</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-dash-border rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Eye size={80} className="!text-dash-textMuted" />
            </div>
            <p className="text-xs font-bold !text-dash-textMuted tracking-widest mb-2">Active Watchlists</p>
            <h3 className="text-4xl font-black !text-dash-text">{watchlists.filter((w: any) => w.is_active).length}</h3>
            <p className="text-sm !text-dash-textMuted mt-2">Currently scanning the market.</p>
          </div>
          
          <div className={`bg-white border rounded-2xl p-6 relative overflow-hidden ${unreadCount > 0 ? 'border-dash-accent/30' : 'border-dash-border'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Activity size={80} className={unreadCount > 0 ? 'text-dash-accent' : '!text-dash-textMuted'} />
            </div>
            <p className={`text-xs font-bold tracking-widest mb-2 ${unreadCount > 0 ?'text-dash-accent' :'!text-dash-textMuted'}`}>Unread Alerts</p>
            <h3 className="text-4xl font-black !text-dash-text">{unreadCount}</h3>
            <p className="text-sm !text-dash-textMuted mt-2">Recent changes detected.</p>
          </div>

          <div className={`bg-white border rounded-2xl p-6 relative overflow-hidden ${highPriorityCount > 0 ? 'border-red-500/30' : 'border-dash-border'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <ShieldAlert size={80} className={highPriorityCount > 0 ? 'text-red-400' : '!text-dash-textMuted'} />
            </div>
            <p className={`text-xs font-bold tracking-widest mb-2 ${highPriorityCount > 0 ?'text-red-400' :'!text-dash-textMuted'}`}>High Priority</p>
            <h3 className="text-4xl font-black !text-dash-text">{highPriorityCount}</h3>
            <p className="text-sm !text-dash-textMuted mt-2">Requires immediate attention.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <WatchlistManager initialWatchlists={watchlists} />
          <AlertCenter alerts={alerts} />
        </div>
      </div>
    </Wrapper>
  );
}
