'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Eye, Lock, Unlock, ChevronDown, MoreHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface PresenceUser {
  email: string
  initials: string
  locked?: boolean
}

interface InvitePresenceListProps {
  formId: string
}

export function InvitePresenceList({ formId }: InvitePresenceListProps) {
  const [userEmail, setUserEmail] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    let activeChannel: any;
    let mounted = true;

    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email || !mounted) return;
      const email = user.email;
      const initials = email.substring(0, 2).toUpperCase();
      setUserEmail(email);
      setUserInitials(initials);

      activeChannel = supabase.channel(`form_presence_${formId}`, {
        config: { presence: { key: email } },
      });

      activeChannel
        .on('presence', { event: 'sync' }, () => {
          if (!mounted) return;
          const state = activeChannel.presenceState();
          const users: PresenceUser[] = [];
          for (const key in state) {
            const presences = state[key] as any[];
            if (presences?.length > 0) {
              users.push({ email: key, ...presences[0] });
            }
          }
          setActiveUsers(users.filter(u => u.email !== email));
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await activeChannel.track({ email, initials, locked: false });
          }
        });
    };

    init();

    return () => {
      mounted = false;
      if (activeChannel) {
        activeChannel.untrack();
        activeChannel.unsubscribe();
      }
    };
  }, [formId]);

  const totalActive = activeUsers.length + (userEmail ? 1 : 0);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[10px] font-bold',
          'bg-[#0c1535] border-white/5 text-t2 hover:text-t1 hover:border-white/10'
        )}
      >
        <div className="flex items-center -space-x-1.5">
          {userEmail && (
            <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-[#0c1535] flex items-center justify-center text-[7px] font-black text-white z-10">
              {userInitials}
            </div>
          )}
          {activeUsers.slice(0, 3).map((u, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full bg-purple-500 border-2 border-[#0c1535] flex items-center justify-center text-[7px] font-black text-white"
              style={{ zIndex: 10 - i - 1 }}
            >
              {u.initials}
            </div>
          ))}
          {activeUsers.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-[#172458] border-2 border-[#0c1535] flex items-center justify-center text-[7px] font-bold text-t3">
              +{activeUsers.length - 3}
            </div>
          )}
        </div>
        <span className="text-[9px] text-t3 hidden sm:inline">{totalActive} active</span>
        <ChevronDown size={10} className="text-t4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-64 bg-[#080f28] border border-white/10 rounded-xl shadow-2xl z-50 p-2">
            <div className="px-2 py-1.5 border-b border-white/5 mb-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-t4">Active Session</span>
              <span className="text-[9px] text-t3 ml-2">({totalActive})</span>
            </div>

            {userEmail && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-500/10 mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-[8px] font-black flex items-center justify-center text-white">{userInitials}</div>
                  <span className="text-[10px] font-bold text-white truncate max-w-[120px]">{userEmail}</span>
                </div>
                <span className="text-[8px] font-black uppercase tracking-wider text-t4">You</span>
              </div>
            )}

            {activeUsers.map((u, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-[8px] font-black flex items-center justify-center text-white flex-shrink-0">{u.initials}</div>
                  <span className="text-[10px] font-bold text-white truncate">{u.email}</span>
                </div>
                {u.locked && <Lock size={10} className="text-rose-400 flex-shrink-0" />}
              </div>
            ))}

            {activeUsers.length === 0 && (
              <div className="p-4 text-center text-[9px] font-bold text-t3 uppercase tracking-wider">
                No other active collaborators
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
