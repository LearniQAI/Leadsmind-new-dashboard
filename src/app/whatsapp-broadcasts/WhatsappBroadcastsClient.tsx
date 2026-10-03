'use client';

import React, { useState } from 'react';
import { Bot, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import BroadcastsView, { type CampaignRow } from './BroadcastsView';
import RepliesView, { type RuleRow } from './RepliesView';

export default function WhatsappBroadcastsClient({ initialCampaigns, initialRules }: {
  initialCampaigns: CampaignRow[]; initialRules: RuleRow[];
}) {
  const [view, setView] = useState<'broadcasts' | 'replies'>('broadcasts');
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(initialCampaigns);
  const [rules, setRules] = useState<RuleRow[]>(initialRules);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight !text-dash-text">WhatsApp Broadcasts</h1>
          <p className="text-sm !text-dash-textMuted font-medium">
            Scheduled bulk WhatsApp sends and keyword-triggered automated replies, via your connected WhatsApp Business account.
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-dash-surface border border-dash-border rounded-xl">
          <button
            onClick={() => setView('broadcasts')}
            className={cn('h-9 px-4 rounded-lg text-[12.5px] font-bold flex items-center gap-2 transition-colors', view === 'broadcasts' ? 'bg-white shadow-sm !text-dash-text' : '!text-dash-textMuted')}
          >
            <Radio size={14} /> Broadcasts
          </button>
          <button
            onClick={() => setView('replies')}
            className={cn('h-9 px-4 rounded-lg text-[12.5px] font-bold flex items-center gap-2 transition-colors', view === 'replies' ? 'bg-white shadow-sm !text-dash-text' : '!text-dash-textMuted')}
          >
            <Bot size={14} /> Automated Replies
          </button>
        </div>
      </div>

      {view === 'broadcasts' ? (
        <BroadcastsView campaigns={campaigns} setCampaigns={setCampaigns} />
      ) : (
        <RepliesView rules={rules} setRules={setRules} />
      )}
    </div>
  );
}
