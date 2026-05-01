"use client";

import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function AutomationLogsSection({ logs }: { logs: any[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 rounded-[32px] border border-white/5 bg-white/[0.01]">
        <Zap className="h-10 w-10 text-white/5 mb-4" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">No Execution History</h3>
        <p className="text-[10px] text-white/10 mt-1 uppercase tracking-widest">Automation engine idle for this contact.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic">Step-by-Step History</h3>
        <span className="text-[10px] font-bold text-blue-400 bg-blue-400/5 px-2 py-0.5 rounded-md border border-blue-400/10">
          {logs.length} ACTIONS LOGGED
        </span>
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <div 
            key={log.id} 
            className="group relative flex items-start gap-4 p-4 rounded-2xl border border-white/5 bg-[#08080f] transition-all hover:bg-[#0c0c14]"
          >
            <div className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px]",
              log.status === 'completed' && "bg-emerald-500/5 border-emerald-500/10 text-emerald-500/80",
              log.status === 'failed' && "bg-rose-500/5 border-rose-500/10 text-rose-500",
              log.status === 'running' && "bg-blue-500/5 border-blue-500/10 text-blue-400",
              log.status === 'skipped' && "bg-white/5 border-white/10 text-white/20"
            )}>
              {log.status === 'completed' && <CheckCircle2 size={12} />}
              {log.status === 'failed' && <XCircle size={12} />}
              {log.status === 'running' && <Clock size={12} className="animate-spin" />}
              {log.status === 'skipped' && <ChevronRight size={12} />}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-white uppercase tracking-tight">
                  {log.execution?.workflow?.name || 'Automation Flow'} 
                  <span className="mx-2 text-white/10">•</span>
                  <span className="text-white/40 font-bold uppercase text-[9px] tracking-widest">Step: {log.step?.type?.replace('_', ' ')}</span>
                </p>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
              </div>
              
              {log.error_message ? (
                <p className="text-[10px] text-rose-400/80 leading-relaxed font-mono mt-1">
                  ERR: {log.error_message}
                </p>
              ) : (
                <p className="text-[10px] text-white/20 leading-relaxed uppercase tracking-tighter">
                  Instruction executed on automation server. Output: Success.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
