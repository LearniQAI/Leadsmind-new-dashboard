'use client';

import React from 'react';
import { Activity, Clock, FileText, User, ArrowRight, Phone, Mail, Building2, Link as LinkIcon, Target } from 'lucide-react';
import Link from 'next/link';

export function UnifiedActivityFeed({ activities }: { activities: any[] }) {
  const getIcon = (type: string, entityType: string) => {
    if (type === 'note') return <FileText size={14} className="text-blue-400" />;
    if (type === 'call') return <Phone size={14} className="text-emerald-400" />;
    if (type === 'email') return <Mail size={14} className="text-amber-400" />;
    if (type === 'stage_change') return <Target size={14} className="text-purple-400" />;
    if (entityType === 'lead' || type === 'imported') return <Building2 size={14} className="text-accent" />;
    if (entityType === 'contact') return <User size={14} className="text-t4" />;
    return <Clock size={14} className="text-t4" />;
  };

  return (
    <div className="bg-n800 border border-white/10 rounded-3xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-space font-bold text-white flex items-center gap-2">
          <Activity className="text-accent" /> Activity Timeline
        </h3>
        <Link href="/crm/activity" className="text-xs font-bold text-t4 hover:text-white uppercase tracking-wider transition-colors flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 relative custom-scrollbar">
        <div className="absolute top-0 bottom-0 left-[19px] w-px bg-white/5" />
        
        {activities.length === 0 ? (
          <p className="text-t4 text-sm text-center pt-8">No recent CRM activity.</p>
        ) : (
          activities.map((item) => (
            <div key={item.id} className="relative flex gap-4">
              <div className="w-10 h-10 rounded-full bg-n900 border border-white/10 flex items-center justify-center shrink-0 z-10 relative">
                {getIcon(item.activity_type, item.entity_type)}
              </div>
              <div className="pt-1 w-full">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="text-xs font-bold text-t3 flex items-center gap-2">
                    {item.auth_user?.email?.split('@')[0] || 'System Workflow'}
                  </span>
                  <span className="text-[10px] text-t4 uppercase tracking-widest font-semibold shrink-0">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-sm text-white mt-1">
                  {item.content}
                </p>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest text-t4">
                    <LinkIcon size={10} /> {item.entity_type}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
