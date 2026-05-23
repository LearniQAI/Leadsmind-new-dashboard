'use client';

import React from 'react';
import { Activity, Shield, Users, Database, Clock, Zap } from 'lucide-react';

export function WorkspaceAuditTimeline({ logs }: { logs: any[] }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'approval_request': return <Shield size={14} className="text-amber-400" />;
      case 'workspace_member': return <Users size={14} className="text-blue-400" />;
      case 'automation_workflow': return <Zap size={14} className="text-accent" />;
      default: return <Database size={14} className="text-t4" />;
    }
  };

  return (
    <div className="bg-n800 border border-white/10 rounded-3xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-space font-bold text-white flex items-center gap-2">
          <Activity className="text-accent" /> Governance Audit Log
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 relative custom-scrollbar">
        <div className="absolute top-0 bottom-0 left-[19px] w-px bg-white/5" />
        
        {(!logs || logs.length === 0) ? (
          <p className="text-t4 text-sm text-center pt-8">No governance actions recorded.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="relative flex gap-4 group">
              <div className="w-10 h-10 rounded-full bg-n900 border border-white/10 flex items-center justify-center shrink-0 z-10 relative group-hover:border-accent/40 transition-colors">
                {getIcon(log.resource_type)}
              </div>
              <div className="pt-1 w-full">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="text-xs font-bold text-t3 flex items-center gap-2">
                    {log.auth_user?.email?.split('@')[0] || 'System Workflow'}
                  </span>
                  <span className="text-[10px] text-t4 uppercase tracking-widest font-semibold shrink-0 flex items-center gap-1">
                    <Clock size={10} /> {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>
                
                <p className="text-sm text-white mt-1 capitalize font-medium">
                  {log.action.replace(/_/g, ' ')}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest text-t4">
                    {log.resource_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-t4 font-mono truncate max-w-[150px]">
                    ID: {log.resource_id?.split('-')[0]}
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
