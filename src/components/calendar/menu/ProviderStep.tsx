'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, User, CheckCircle2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Provider {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  bio?: string;
}

interface ProviderStepProps {
  providers: Provider[];
  onSelect: (provider: Provider) => void;
  onBack: () => void;
}

export function ProviderStep({ providers, onSelect, onBack }: ProviderStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 gap-2 px-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Back to Services</span>
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#2563eb]"></div>
          <div className="h-2 w-2 rounded-full bg-[#2563eb]"></div>
          <div className="h-2 w-2 rounded-full bg-white/10"></div>
        </div>
      </div>

      <div className="text-center mb-10">
        <h2 className="text-[20px] font-bold text-[#eef2ff] uppercase tracking-tight font-space">Select your <span className="text-[#3b82f6]">Strategist</span></h2>
        <p className="text-[12px] text-[#4a5a82] mt-2">Choose an available team member to host your upcoming session.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onSelect(provider)}
            className="group relative text-left bg-[#080f28]/60 border border-white/5 rounded-2xl p-5 hover:border-[#2563eb]/30 hover:bg-[#0c1535] transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 rounded-xl border-2 border-white/5 group-hover:border-[#2563eb]/50 transition-all">
                <AvatarImage src={provider.avatar} />
                <AvatarFallback className="bg-white/5 text-[#eef2ff] font-bold font-space text-[18px]">
                  {provider.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-[#eef2ff] truncate group-hover:text-white transition-colors">
                    {provider.name}
                  </h3>
                  <div className="h-2 w-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                </div>
                <p className="text-[11px] font-bold text-[#3b82f6] uppercase tracking-widest mt-0.5">{provider.role}</p>
                <div className="flex items-center gap-3 mt-3">
                   <div className="flex items-center gap-1">
                     <Globe className="h-3 w-3 text-[#4a5a82]" />
                     <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest">Global Node</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <CheckCircle2 className="h-3 w-3 text-[#4a5a82]" />
                     <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest">Verified</span>
                   </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
