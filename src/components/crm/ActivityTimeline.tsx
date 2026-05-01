'use client';

import { ContactActivity } from '@/types/crm.types';
import { format } from 'date-fns';
import { 
  MessageSquare, 
  CheckSquare, 
  Target,
  Settings, 
  Clock,
  ReceiptText,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityTimelineProps {
  activities: ContactActivity[];
}

const activityIcons: Record<string, { icon: any; color: string; bg: string }> = {
  note: { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  task: { icon: CheckSquare, color: 'text-green-400', bg: 'bg-green-400/10' },
  deal: { icon: Target, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  system: { icon: Settings, color: 'text-white/40', bg: 'bg-white/5' },
  invoice: { icon: ReceiptText, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  quote: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:left-[19px] before:w-[2px] before:bg-white/[0.03] before:my-4">
      {activities?.map((activity) => {
        const config = activityIcons[activity.type] || activityIcons.system;
        return (
          <div key={activity.id} className="relative pl-14 group">
            <div className={cn(
              "absolute left-0 h-10 w-10 rounded-xl flex items-center justify-center border border-white/5 shadow-xl z-10 transition-all group-hover:scale-110",
              config.bg
            )}>
              <config.icon className={cn("h-4 w-4", config.color)} />
            </div>
            <div className="flex flex-col gap-1 pt-1">
               <div className="flex items-center justify-between">
                  <span className="text-xs text-white/90 font-bold uppercase tracking-tight group-hover:text-primary transition-colors">
                    {activity.description}
                  </span>
                  <div className="flex items-center gap-1.5 text-white/20">
                     <Clock className="h-3 w-3" />
                     <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                       {format(new Date(activity.created_at), 'HH:mm')}
                     </span>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">
                    {format(new Date(activity.created_at), 'MMMM d, yyyy')}
                  </span>
               </div>
               {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="mt-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                     {activity.type === 'invoice' ? (
                        <div className="flex items-center justify-between">
                           <span className="text-white/20">Amount: <span className="text-success">${activity.metadata.amount?.toLocaleString()}</span></span>
                           <span className="text-primary">{activity.metadata.status}</span>
                        </div>
                     ) : (
                        <pre className="whitespace-pre-wrap font-sans opacity-60 italic">{JSON.stringify(activity.metadata, null, 2)}</pre>
                     )}
                  </div>
               )}
            </div>
          </div>
        );
      })}
      {(!activities || activities.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-white/5 border-2 border-dashed border-white/[0.02] rounded-3xl">
            <Clock className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Activity Logged</p>
        </div>
      )}
    </div>
  );
}
