'use client';

import React, { useState, useEffect } from 'react';
import { History, Sparkles, Send, RefreshCw, GitCommit, Eye } from 'lucide-react';
import { DraftSyncEngine, SyncPayload } from '@/lib/realtime/DraftSyncEngine';
import { AuditLogger } from '@/lib/governance/AuditLogger';

export function CollabActivityFeed({ formId }: { formId: string }) {
  const [feedItems, setFeedItems] = useState<any[]>([]);

  // Load baseline logs
  const loadHistoricalLogs = async () => {
    const history = await AuditLogger.getTimeline(formId);
    setFeedItems(history.map(log => ({
      id: log.id,
      actor: log.actor,
      timestamp: log.created_at,
      action: log.action,
      summary: log.summary
    })));
  };

  useEffect(() => {
    loadHistoricalLogs();

    // Subscribe to live updates
    const unsubSync = DraftSyncEngine.onSyncReceived(formId, (payload: SyncPayload) => {
      const newItem = {
        id: crypto.randomUUID(),
        actor: payload.actor,
        timestamp: payload.timestamp,
        action: payload.changeType,
        summary: `Modified form draft ${payload.changeType}`
      };
      setFeedItems(prev => [newItem, ...prev].slice(0, 30));
    });

    const unsubGov = DraftSyncEngine.onGovernanceEventReceived(formId, (payload) => {
      const newItem = {
        id: crypto.randomUUID(),
        actor: payload.actor,
        timestamp: new Date().toISOString(),
        action: payload.action,
        summary: `Governance Action: ${payload.action} (v${payload.versionNumber || ''})`
      };
      setFeedItems(prev => [newItem, ...prev].slice(0, 30));
    });

    return () => {
      unsubSync();
      unsubGov();
    };
  }, [formId]);

  const getActionDetails = (action: string) => {
    switch (action) {
      case 'publish': return { color: 'text-emerald-400', icon: <Send size={11} /> };
      case 'unpublish': return { color: 'text-rose-400', icon: <Send size={11} /> };
      case 'rollback': return { color: 'text-blue-400', icon: <RefreshCw size={11} /> };
      case 'ai_approval': return { color: 'text-purple-400', icon: <Sparkles size={11} /> };
      case 'fields': return { color: 'text-blue-400', icon: <GitCommit size={11} /> };
      default: return { color: 'text-white/60', icon: <Eye size={11} /> };
    }
  };

  return (
    <div className="bg-[#0c1535] border border-white/5 p-4 rounded-xl font-dm-sans text-white flex flex-col gap-4">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] flex items-center gap-1.5">
          <History size={12} className="text-blue-400" /> Collaboration Timeline
        </span>
        
        <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest animate-pulse">
          Live stream
        </span>
      </div>

      {/* Renders streams */}
      <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
        {feedItems.map((item) => {
          const detail = getActionDetails(item.action);
          return (
            <div
              key={item.id}
              className="p-3 bg-white/2 border border-white/5 rounded-lg flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex gap-2 items-start">
                <div className={`p-1.5 bg-white/5 border border-white/5 rounded mt-0.5 ${detail.color}`}>
                  {detail.icon}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-white/90">{item.summary}</span>
                  <span className="text-[9px] text-[#4a5a82]">By {item.actor}</span>
                </div>
              </div>

              <span className="text-[8px] text-[#4a5a82] font-mono whitespace-nowrap mt-1">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          );
        })}

        {feedItems.length === 0 && (
          <div className="py-6 text-center text-white/30 text-[10px] font-bold uppercase tracking-wider">
            No activity logged yet.
          </div>
        )}
      </div>

    </div>
  );
}

const crypto = {
  randomUUID: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
};
