'use client';

import React from 'react';
import { Plus, Target, BarChart3, TrendingUp, ArrowUpRight } from 'lucide-react';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import {
  DashTableContainer, DashTable, DashTableHead, DashTableHeadCell,
  DashTableBody, DashTableRow, DashTableCell, DashTableEmptyState
} from '@/components/dashboard-ui/Table';

export default function AdsClient({ initialCampaigns }: { initialCampaigns: any[] }) {
 const totalSpend = initialCampaigns.reduce((acc, c) => acc + Number(c.spend_to_date || 0), 0);

 return (
  <div className="space-y-8">
   <div className="flex items-center justify-between">
    <div>
     <h1 className="text-3xl font-bold !text-dash-text">Ad <span className="text-dash-accent">command</span></h1>
     <p className="!text-dash-textMuted text-[12px] font-medium mt-2">Precision ad tracking and neural budget optimization.</p>
    </div>
    <DashButton>
     <Plus className="w-4 h-4" /> Connect ad account
    </DashButton>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <DashCard padding="default">
     <span className="text-[11px] font-bold !text-dash-textMuted block mb-2">Total managed spend</span>
     <div className="flex items-end gap-2">
      <span className="text-3xl font-bold !text-dash-text leading-none">${totalSpend.toLocaleString()}</span>
      <span className="text-xs font-bold text-green flex items-center mb-0.5"><TrendingUp className="w-3 h-3 mr-1" /> +12.5%</span>
     </div>
    </DashCard>
    <DashCard padding="default">
     <span className="text-[11px] font-bold !text-dash-textMuted block mb-2">Active campaigns</span>
     <div className="flex items-end gap-2">
      <span className="text-3xl font-bold !text-dash-text leading-none">{initialCampaigns.length}</span>
      <span className="text-xs font-bold text-green flex items-center mb-0.5"><TrendingUp className="w-3 h-3 mr-1" /> Healthy</span>
     </div>
    </DashCard>
    <DashCard padding="default">
     <span className="text-[11px] font-bold !text-dash-textMuted block mb-2">Neural ROI</span>
     <div className="flex items-end gap-2">
      <span className="text-3xl font-bold !text-dash-text leading-none">3.8x</span>
      <span className="text-xs font-bold text-dash-accent flex items-center mb-0.5"><ArrowUpRight className="w-3 h-3 mr-1" /> Optimized</span>
     </div>
    </DashCard>
   </div>

   <DashTableContainer>
    <div className="p-5 border-b border-dash-border flex items-center justify-between">
     <h3 className="text-sm font-bold !text-dash-text">Active campaigns</h3>
     <DashButton variant="ghost" size="sm">Detailed report</DashButton>
    </div>
    <DashTable>
     <DashTableHead>
      <tr>
       <DashTableHeadCell>Campaign name</DashTableHeadCell>
       <DashTableHeadCell>Platform</DashTableHeadCell>
       <DashTableHeadCell>Status</DashTableHeadCell>
       <DashTableHeadCell>Spend</DashTableHeadCell>
       <DashTableHeadCell className="text-right">Action</DashTableHeadCell>
      </tr>
     </DashTableHead>
     <DashTableBody>
      {initialCampaigns.length === 0 ? (
       <DashTableEmptyState
        colSpan={5}
        icon={Target}
        title="No active ad nodes detected"
        description="Connect an ad account to start tracking campaigns."
       />
      ) : (
       initialCampaigns.map(campaign => (
        <DashTableRow key={campaign.id}>
         <DashTableCell className="font-bold">{campaign.name}</DashTableCell>
         <DashTableCell>
          <DashStatusPill variant="neutral">{campaign.platform}</DashStatusPill>
         </DashTableCell>
         <DashTableCell>
          <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse motion-reduce:animate-none" />
           <span className="text-[11px] font-bold !text-dash-text capitalize">{campaign.status}</span>
          </div>
         </DashTableCell>
         <DashTableCell className="font-bold !text-dash-textMuted">${Number(campaign.spend_to_date).toLocaleString()}</DashTableCell>
         <DashTableCell className="text-right">
          <DashButton variant="ghost" size="icon">
           <BarChart3 size={16} />
          </DashButton>
         </DashTableCell>
        </DashTableRow>
       ))
      )}
     </DashTableBody>
    </DashTable>
   </DashTableContainer>
  </div>
 );
}
