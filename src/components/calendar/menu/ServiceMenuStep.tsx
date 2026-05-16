'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Clock, DollarSign, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category?: string;
}

interface ServiceMenuStepProps {
  services: Service[];
  onSelect: (service: Service) => void;
}

export function ServiceMenuStep({ services, onSelect }: ServiceMenuStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2 text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563eb]/10 border border-[#2563eb]/20 mb-2">
          <Sparkles className="h-3 w-3 text-[#3b82f6]" />
          <span className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-widest">Select Service</span>
        </div>
        <h2 className="text-[24px] font-bold text-[#eef2ff] uppercase tracking-tight font-space">Professional <span className="text-[#3b82f6]">Offerings</span></h2>
        <p className="text-[13px] text-[#4a5a82] max-w-md mx-auto">Choose the orchestration that best fits your strategic objectives to begin the scheduling journey.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className="group relative text-left transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2563eb]/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
            <Card className="relative bg-[#080f28]/60 border-white/5 rounded-2xl overflow-hidden group-hover:border-white/10 group-hover:bg-[#0c1535] transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-[#2563eb]/10 group-hover:border-[#2563eb]/20 transition-all">
                    <Clock className="h-5 w-5 text-[#4a5a82] group-hover:text-[#3b82f6]" />
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-[#f59e0b] font-space tracking-tight">
                      ${service.price}
                    </p>
                    <p className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest">Starting at</p>
                  </div>
                </div>

                <h3 className="text-[16px] font-bold text-[#eef2ff] mb-2 group-hover:text-white transition-colors">{service.name}</h3>
                <p className="text-[12px] text-[#4a5a82] leading-relaxed line-clamp-2 mb-4">{service.description}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#94a3c8] font-space">{service.duration} MIN SESSION</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#4a5a82] group-hover:text-[#eef2ff] group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
