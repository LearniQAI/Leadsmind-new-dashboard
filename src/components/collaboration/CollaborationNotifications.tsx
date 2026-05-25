'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, UserCheck, UserX, Clock, Ban, Send, ArrowRight, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CollabNotification {
  id: string
  type: 'active' | 'removed' | 'resent'
  email: string
  formName: string
  formId?: string
  timestamp: string
  read: boolean
}

const notificationConfig = {
  active: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Active' },
  removed: { icon: UserX, color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Removed' },
  resent: { icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Resent' },
};

function formatTime(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

export function CollaborationNotifications() {
  const [notifications, setNotifications] = useState<CollabNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'team')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data.map(n => ({
        id: n.id,
        type: mapNotificationType(n),
        email: extractEmail(n.message),
        formName: extractFormName(n.message),
        formId: n.link?.split('/forms/')[1]?.split('/')[0],
        timestamp: n.created_at,
        read: n.read
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const supabase = createClient();

    const channel = supabase
      .channel('collab-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `type=eq.team`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications]);

  return (
    <div className="flex flex-col gap-3">
      {notifications.length === 0 && !loading && (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 mx-auto mb-3 flex items-center justify-center">
            <Bell size={20} className="text-t4 opacity-40" />
          </div>
          <p className="text-[11px] font-bold text-t3 uppercase tracking-widest">No collaboration updates</p>
        </div>
      )}

      {loading && (
        <div className="py-8 text-center">
          <p className="text-[10px] font-bold text-t3 uppercase tracking-widest animate-pulse">Loading updates...</p>
        </div>
      )}

      {notifications.map((n) => {
        const cfg = notificationConfig[n.type];
        return (
          <div
            key={n.id}
            className={cn(
              'flex items-start gap-3 p-3.5 rounded-xl border transition-all',
              n.read
                ? 'bg-[#04091a] border-white/5'
                : 'bg-[#0b132c] border-blue-500/20'
            )}
          >
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
              <cfg.icon size={16} className={cfg.color} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>
                  {cfg.label}
                </span>
                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
              </div>
              <p className="text-[11px] text-t2 leading-relaxed">
                {n.type === 'active' && <><strong className="text-t1">{n.email}</strong> accepted your invitation to <strong className="text-blue-400">{n.formName}</strong></>}
                {n.type === 'removed' && <>Invitation to <strong className="text-t1">{n.email}</strong> for <strong className="text-blue-400">{n.formName}</strong> was removed</>}
                {n.type === 'resent' && <>Invitation resent to <strong className="text-t1">{n.email}</strong> for <strong className="text-blue-400">{n.formName}</strong></>}
              </p>
              <p className="text-[9px] text-t4 mt-0.5">{formatTime(n.timestamp)}</p>
            </div>

            {n.formId && (
              <a
                href={`/forms/${n.formId}/governance`}
                className="flex items-center gap-1 text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors mt-1 flex-shrink-0"
              >
                View <ArrowRight size={10} />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

function mapNotificationType(n: any): CollabNotification['type'] {
  const msg = (n.message || '').toLowerCase();
  if (msg.includes('accepted')) return 'active';
  if (msg.includes('removed') || msg.includes('revoked') || msg.includes('declined') || msg.includes('expired')) return 'removed';
  if (msg.includes('resent') || msg.includes('reminder')) return 'resent';
  return 'active';
}

function extractEmail(msg: string): string {
  const match = msg?.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
  return match?.[1] || '';
}

function extractFormName(msg: string): string {
  const match = msg?.match(/"([^"]+)"/);
  return match?.[1] || msg?.split('"')[1] || 'a form';
}
