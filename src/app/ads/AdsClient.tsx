'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Target, BarChart3, TrendingUp, DollarSign, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdsClient({ initialCampaigns }: { initialCampaigns: any[] }) {
  const totalSpend = initialCampaigns.reduce((acc, c) => acc + Number(c.spend_to_date || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white italic leading-none">Ad <span className="text-primary">Command</span></h1>
          <p className="text-white/40 text-sm font-medium mt-2 italic">Precision ad tracking and neural budget optimization.</p>
        </div>
        <Button className="bg-primary hover:bg-primary-dark text-white font-black uppercase italic tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Connect Ad Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] -mr-16 -mt-16" />
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 block mb-2">Total Managed Spend</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-white italic leading-none">${totalSpend.toLocaleString()}</span>
              <span className="text-xs font-bold text-success flex items-center mb-0.5"><TrendingUp className="w-3 h-3 mr-1" /> +12.5%</span>
            </div>
          </div>
        </div>
        <div className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-full blur-[40px] -mr-16 -mt-16" />
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 block mb-2">Active Campaigns</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-white italic leading-none">{initialCampaigns.length}</span>
              <span className="text-xs font-bold text-success flex items-center mb-0.5"><TrendingUp className="w-3 h-3 mr-1" /> Healthy</span>
            </div>
          </div>
        </div>
        <div className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] -mr-16 -mt-16" />
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 block mb-2">Neural ROI</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-white italic leading-none">3.8x</span>
              <span className="text-xs font-bold text-primary flex items-center mb-0.5"><ArrowUpRight className="w-3 h-3 mr-1" /> Optimized</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0b0b1a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Active Campaigns</h3>
          <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white">Detailed Report</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Campaign Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Platform</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Spend</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/20 font-bold uppercase tracking-widest italic">No active ad nodes detected</td>
                </tr>
              ) : (
                initialCampaigns.map(campaign => (
                  <tr key={campaign.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white italic">{campaign.name}</td>
                    <td className="px-6 py-4">
                      <Badge className="text-[9px] font-black uppercase tracking-widest bg-white/10 text-white/60 border-none">
                        {campaign.platform}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{campaign.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-white/60">${Number(campaign.spend_to_date).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="text-white/20 hover:text-primary"><BarChart3 size={16} /></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
