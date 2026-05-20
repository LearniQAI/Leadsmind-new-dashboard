'use client';

import React, { useState, useEffect } from 'react';
import { Users, Lock, Unlock, Eye } from 'lucide-react';

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

  useEffect(() => {
    const fetchUser = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) {
        setUserEmail(data.user.email);
        setUserInitials(data.user.email.substring(0, 2).toUpperCase());
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="flex items-center gap-4 bg-[#0c1535] border border-white/5 px-4 py-2 rounded-xl text-white font-dm-sans">
      
      {/* Active Avatar Rings */}
      <div className="flex items-center -space-x-2">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#04081a] bg-blue-500 text-white cursor-pointer relative group`}
          title={userEmail}
        >
          {userInitials}
          
          {/* Status dot */}
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#04081a] animate-pulse" />

          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#0b132c] border border-white/10 text-[9px] font-bold uppercase tracking-wider py-1 px-2.5 rounded shadow-xl whitespace-nowrap z-50">
            {userEmail} (Active)
          </div>
        </div>
      </div>

      {/* Connection Indicator Stats */}
      <div className="flex flex-col gap-0.5 border-l border-white/10 pl-3">
        <span className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82] flex items-center gap-1">
          <Eye size={10} className="text-emerald-400" /> Active Session
        </span>
        <span className="text-[10px] font-bold text-white/70">
          Editing as {userEmail.split('@')[0]}
        </span>
      </div>

      {/* Editing Lock Toggle Scaffold */}
      <button
        onClick={() => setIsLocked(!isLocked)}
        className={`h-7 px-3 rounded-lg border flex items-center gap-1.5 transition-all text-[9px] font-black uppercase tracking-wider ${
          isLocked 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60 hover:text-white'
        }`}
      >
        {isLocked ? (
          <>
            <Lock size={11} /> Locked
          </>
        ) : (
          <>
            <Unlock size={11} /> Unlocked
          </>
        )}
      </button>

    </div>
  );
}
