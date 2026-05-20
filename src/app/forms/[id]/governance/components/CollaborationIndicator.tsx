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
  // Scaffolding mock active editors for multi-user collaboration presence
  const [activeUsers] = useState<ActiveUser[]>([
    { email: 'admin@leadsmind.com', name: 'Alex Cooper (You)', color: 'bg-blue-500', initials: 'AC' },
    { email: 'designer@leadsmind.com', name: 'Sarah Miller', color: 'bg-purple-500', initials: 'SM' }
  ]);

  const [isLocked, setIsLocked] = useState(false);
  const [lastEditor, setLastEditor] = useState('Sarah Miller');

  useEffect(() => {
    // Scaffold automatic simulated activity heartbeat ticks
    const interval = setInterval(() => {
      setLastEditor(Math.random() > 0.5 ? 'Alex Cooper' : 'Sarah Miller');
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-4 bg-[#0c1535] border border-white/5 px-4 py-2 rounded-xl text-white font-dm-sans">
      
      {/* Active Avatar Rings */}
      <div className="flex items-center -space-x-2">
        {activeUsers.map((user, idx) => (
          <div
            key={idx}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#04081a] ${user.color} text-white cursor-pointer relative group`}
            title={user.name}
          >
            {user.initials}
            
            {/* Status dot */}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#04081a] animate-pulse" />

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#0b132c] border border-white/10 text-[9px] font-bold uppercase tracking-wider py-1 px-2.5 rounded shadow-xl whitespace-nowrap z-50">
              {user.name} ({user.email})
            </div>
          </div>
        ))}
      </div>

      {/* Connection Indicator Stats */}
      <div className="flex flex-col gap-0.5 border-l border-white/10 pl-3">
        <span className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82] flex items-center gap-1">
          <Eye size={10} className="text-blue-400" /> Active Session
        </span>
        <span className="text-[10px] font-bold text-white/70">
          Last edited by {lastEditor}
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
            <Lock size={11} /> Workspace Locked
          </>
        ) : (
          <>
            <Unlock size={11} /> Shared Session
          </>
        )}
      </button>

    </div>
  );
}
