'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Users, Lock, Unlock, Eye, ChevronDown } from 'lucide-react';
import { AuditLogger } from '@/lib/governance/AuditLogger';

interface ActiveUser {
  email: string;
  name: string;
  color: string;
  initials: string;
}

export function CollaborationIndicator({ formId }: { formId: string }) {
  const [userEmail, setUserEmail] = useState('You');
  const [userInitials, setUserInitials] = useState('Y');
  const [isLocked, setIsLocked] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [channel, setChannel] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOwner = userEmail.toLowerCase() === 'oderinwalematthew3@gmail.com';

  useEffect(() => {
    let activeChannel: any;
    
    const initPresence = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      
      let email = 'Guest';
      let initials = 'G';
      
      if (data?.user?.email) {
        email = data.user.email;
        initials = email.substring(0, 2).toUpperCase();
        setUserEmail(email);
        setUserInitials(initials);
      }

      activeChannel = supabase.channel(`form_presence_${formId}`, {
        config: { presence: { key: email } },
      });

      activeChannel
        .on('presence', { event: 'sync' }, () => {
          const state = activeChannel.presenceState();
          const users: any[] = [];
          
          for (const key in state) {
            const presences = state[key] as any[];
            if (presences && presences.length > 0) {
              users.push(presences[0]);
            }
          }
          
          setActiveUsers(users.filter(u => u.email !== email)); // Others
        })
        .on('broadcast', { event: 'lock_state_change' }, ({ payload }: any) => {
          if (payload.targetEmail === email && !isOwner) { // Owner cannot be locked
            setIsLocked(payload.locked);
          }
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await activeChannel.track({ email, initials, locked: false });
          }
        });
        
      setChannel(activeChannel);
    };

    initPresence();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      if (activeChannel) {
        activeChannel.untrack();
        activeChannel.unsubscribe();
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [formId]);

  useEffect(() => {
    if (channel) {
      channel.track({ email: userEmail, initials: userInitials, locked: isLocked });
    }
  }, [isLocked]);

  const toggleUserLock = async (targetEmail: string, currentLockState: boolean) => {
    if (!isOwner) return; // Only owner can toggle locks
    const newLockState = !currentLockState;

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'lock_state_change',
        payload: { targetEmail, locked: newLockState }
      });
    }

    // Instantly update the local UI state for snappy feedback
    setActiveUsers(prev => prev.map(u => 
      u.email === targetEmail ? { ...u, locked: newLockState } : u
    ));

    // Log the action so it appears in real-time Activity Logs
    await AuditLogger.logAction(
      formId,
      'collab',
      userEmail,
      `${newLockState ? 'Locked' : 'Unlocked'} editing access for ${targetEmail}`
    );
  };

  return (
    <div className="flex items-center gap-4 bg-[#0c1535] border border-white/5 px-4 py-2 rounded-xl text-white font-dm-sans">
      
      {/* Active Avatar Rings */}
      <div className="flex items-center -space-x-2">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#04081a] bg-blue-500 text-white cursor-pointer relative group`}
          title={userEmail}
        >
          {userInitials}
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#04081a] animate-pulse" />
          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#0b132c] border border-white/10 text-[9px] font-bold uppercase tracking-wider py-1 px-2.5 rounded shadow-xl whitespace-nowrap z-50">
            {userEmail} (You)
          </div>
        </div>

        {activeUsers.map((u, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#04081a] bg-purple-500 text-white cursor-pointer relative group`}
            title={u.email}
          >
            {u.initials}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#04081a] animate-pulse" />
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#0b132c] border border-white/10 text-[9px] font-bold uppercase tracking-wider py-1 px-2.5 rounded shadow-xl whitespace-nowrap z-50">
              {u.email} {u.locked ? '(Locked Form)' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Connection Indicator Stats & Dropdown */}
      <div className="relative flex flex-col border-l border-white/10 pl-3" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82] flex items-center gap-1">
              <Eye size={10} className="text-emerald-400" /> Active Session
            </span>
            <span className="text-[10px] font-bold text-white/70">
              Editing as {userEmail.split('@')[0]} {isOwner && <span className="text-blue-400 font-black">(Owner)</span>}
            </span>
          </div>
          <ChevronDown size={14} className="text-white/40" />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full mt-3 right-0 w-64 bg-[#0b132c] border border-white/10 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1">
            <div className="px-2 py-1.5 border-b border-white/5 mb-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Active Collaborators</span>
            </div>

            {/* Current User */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500 text-[8px] font-black flex items-center justify-center text-white">{userInitials}</div>
                <span className="text-[10px] font-bold text-white truncate max-w-[100px]">{userEmail} (You)</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-[#4a5a82]">
                {isOwner ? 'Owner' : isLocked ? 'Locked' : 'Editor'}
              </span>
            </div>

            {/* Other Users */}
            {activeUsers.map((u, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-500 text-[8px] font-black flex items-center justify-center text-white">{u.initials}</div>
                  <span className="text-[10px] font-bold text-white truncate max-w-[100px]">{u.email}</span>
                </div>
                
                {isOwner && (
                  <button
                    onClick={() => toggleUserLock(u.email, u.locked || false)}
                    className={`h-6 px-2 rounded border text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                      u.locked
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {u.locked ? <Unlock size={10} /> : <Lock size={10} />}
                    {u.locked ? 'Unlock' : 'Lock'}
                  </button>
                )}
              </div>
            ))}

            {activeUsers.length === 0 && (
              <div className="p-3 text-center text-[9px] font-bold text-white/30 uppercase tracking-wider">
                No other users active right now.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
