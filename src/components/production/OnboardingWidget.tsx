'use client';

import React, { useState } from 'react';
import { Target, CheckCircle2, Circle, ArrowRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function OnboardingWidget({ progress }: { progress: any[] }) {
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();

  if (isDismissed) return null;

  const modules = [
    { id: 'workspace', label: 'Create Workspace', href: '/workspace' },
    { id: 'leadsfinder', label: 'Run Lead Search', href: '/lead-finder' },
    { id: 'crm', label: 'Import Contacts', href: '/crm' },
    { id: 'forms', label: 'Build Lead Form', href: '/forms' },
    { id: 'automation', label: 'Setup Workflow', href: '/automation' },
  ];

  const completedCount = modules.filter(m => progress.some(p => p.module === m.id && p.is_completed)).length;
  
  if (completedCount === modules.length) return null;

  return (
    <div className="fixed bottom-6 left-6 w-[320px] bg-n800 border border-white/10 shadow-2xl rounded-3xl overflow-hidden z-40 animate-in slide-in-from-bottom-10">
      <div className="p-4 bg-accent/10 border-b border-accent/20 flex items-center justify-between">
        <h4 className="font-space font-bold text-accent text-sm flex items-center gap-2">
          <Target size={16} /> Quick Setup Guide
        </h4>
        <button onClick={() => setIsDismissed(true)} className="text-t4 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="w-full bg-n900 rounded-full h-1.5 mb-2 overflow-hidden">
          <div 
            className="bg-accent h-full rounded-full transition-all duration-1000" 
            style={{ width: `${(completedCount / modules.length) * 100}%` }}
          />
        </div>

        <div className="space-y-1">
          {modules.map((m) => {
            const isCompleted = progress.some(p => p.module === m.id && p.is_completed);
            
            return (
              <button 
                key={m.id}
                onClick={() => router.push(m.href)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  {isCompleted ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Circle size={16} className="text-t4" />}
                  <span className={`text-sm font-bold ${isCompleted ? 'text-t4 line-through' : 'text-white'} group-hover:text-accent transition-colors`}>
                    {m.label}
                  </span>
                </div>
                {!isCompleted && <ArrowRight size={14} className="text-t4 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
