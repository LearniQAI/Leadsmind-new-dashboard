'use client';

import React from 'react';
import Link from 'next/link';
import { markAlertRead } from '@/app/actions/watchlist-workspace';
import { Bell, AlertTriangle, AlertCircle, Info, Check, ChevronRight } from 'lucide-react';

export function AlertCenter({ alerts }: { alerts: any[] }) {
  
  const handleMarkRead = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    await markAlertRead(id);
    window.location.reload(); // Simple refresh for MVP
  };

  const getPriorityIcon = (p: string) => {
    if (p === 'High') return <AlertTriangle size={16} className="text-red-400" />;
    if (p === 'Medium') return <AlertCircle size={16} className="text-amber-400" />;
    return <Info size={16} className="text-blue-400" />;
  };

  const getPriorityColor = (p: string) => {
    if (p === 'High') return 'bg-red-500/10 border-red-500/20';
    if (p === 'Medium') return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-blue-500/10 border-blue-500/20';
  };

  return (
    <div className="bg-n800 border border-white/10 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
          <Bell className="text-accent" /> Alert Center
        </h2>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 border-dashed">
            <Bell size={32} className="text-t4 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-t3">All caught up! No recent alerts.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <Link key={alert.id} href={`/lead-finder/lead/${alert.result_id}`}>
              <div className={`p-4 rounded-2xl border transition-all group ${
                alert.is_read ? 'bg-n900 border-white/5 opacity-60' : getPriorityColor(alert.priority)
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getPriorityIcon(alert.priority)}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-t4">
                          {alert.watchlist?.name || 'System Alert'}
                        </span>
                        <span className="text-[10px] text-t4">• {new Date(alert.created_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className={`text-sm font-bold ${alert.is_read ? 'text-t2' : 'text-white'}`}>
                        {alert.title}
                      </h4>
                      <p className="text-xs text-t3 mt-1">
                        {alert.description}
                      </p>
                      {alert.lead && (
                        <p className="text-xs font-semibold text-accent mt-2 flex items-center gap-1 group-hover:underline">
                          View {alert.lead.business_name} <ChevronRight size={12} />
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {!alert.is_read && (
                    <button
                      onClick={(e) => handleMarkRead(e, alert.id)}
                      className="p-1.5 text-t4 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors shrink-0"
                      title="Mark as Read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
