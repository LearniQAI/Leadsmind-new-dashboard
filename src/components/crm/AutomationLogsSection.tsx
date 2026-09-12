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
   <div className="flex flex-col items-center justify-center py-20 px-4 rounded-[32px] border border-dash-border bg-dash-bg">
    <Zap className="h-10 w-10 text-dash-textMuted mb-4 opacity-40" />
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-dash-textMuted">No Execution History</h3>
    <p className="text-[10px] text-dash-textMuted mt-1 uppercase tracking-widest opacity-70">Automation engine idle for this contact.</p>
   </div>
  );
 }

 return (
  <div className="space-y-4">
   <div className="flex items-center justify-between mb-6">
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-dash-textMuted">Step-by-Step History</h3>
    <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
     {logs.length} ACTIONS LOGGED
    </span>
   </div>

   <div className="space-y-2">
    {logs.map((log) => (
     <div
      key={log.id}
      className="group relative flex items-start gap-4 p-4 rounded-2xl border border-dash-border bg-dash-surface transition-all hover:bg-dash-bg"
     >
      <div className={cn(
       "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px]",
       log.status === 'completed' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600",
       log.status === 'failed' && "bg-rose-500/10 border-rose-500/20 text-rose-600",
       log.status === 'running' && "bg-blue-500/10 border-blue-500/20 text-blue-600",
       log.status === 'skipped' && "bg-dash-border/60 border-dash-border text-dash-textMuted"
      )}>
       {log.status === 'completed' && <CheckCircle2 size={12} />}
       {log.status === 'failed' && <XCircle size={12} />}
       {log.status === 'running' && <Clock size={12} className="animate-spin" />}
       {log.status === 'skipped' && <ChevronRight size={12} />}
      </div>

      <div className="flex-1 space-y-1">
       <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-dash-text uppercase tracking-tight">
         {log.execution?.workflow?.name || 'Automation Flow'}
         <span className="mx-2 text-dash-textMuted">•</span>
         <span className="text-dash-textMuted font-bold uppercase text-[9px] tracking-widest">Step: {log.step?.type?.replace('_', ' ')}</span>
        </p>
        <span className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest">
         {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
        </span>
       </div>

       {log.error_message ? (
        <p className="text-[10px] text-rose-600 leading-relaxed font-mono mt-1">
         ERR: {log.error_message}
        </p>
       ) : (
        <p className="text-[10px] text-dash-textMuted leading-relaxed uppercase tracking-tighter">
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
