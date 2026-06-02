'use client';

import React, { useState } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import AppearanceTab from './components/AppearanceTab';
import KnowledgeBaseTab from './components/KnowledgeBaseTab';
import AgentsTab from './components/AgentsTab';
import ConversationsTab from './components/ConversationsTab';
import EmbedTab from './components/EmbedTab';

export default function LenaChatSettingsPage() {
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;
  const [activeTab, setActiveTab] = useState<'widget' | 'knowledge' | 'agents' | 'conversations' | 'embed'>('widget');

  const tabs = [
    { id: 'widget', label: 'Widget Appearance' },
    { id: 'knowledge', label: 'Knowledge Base' },
    { id: 'agents', label: 'Agents' },
    { id: 'conversations', label: 'Conversations' },
    { id: 'embed', label: 'Embed Code' }
  ] as const;

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 w-full flex flex-col">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1
              className="text-[22px] font-bold leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff' }}
            >
              LENA <span className="text-[#3b82f6]">Chat</span>
            </h1>
            <p
              className="text-[11.5px] uppercase tracking-[0.8px] font-medium mt-1 text-[#4a5a82]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              AI + LIVE AGENT CHATBOT FOR YOUR WEBSITE
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[rgba(255,255,255,0.07)] mb-6 gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-[13px] font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-[#3b82f6]'
                  : 'text-[#94a3c8] hover:text-[#eef2ff]'
              }`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3b82f6]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {!workspaceId ? (
          <div className="p-8 text-center text-[#4a5a82] italic">
            Connecting workspace context...
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {activeTab === 'widget' && <AppearanceTab workspaceId={workspaceId} />}
            {activeTab === 'knowledge' && <KnowledgeBaseTab workspaceId={workspaceId} />}
            {activeTab === 'agents' && <AgentsTab workspaceId={workspaceId} />}
            {activeTab === 'conversations' && <ConversationsTab workspaceId={workspaceId} />}
            {activeTab === 'embed' && <EmbedTab workspaceId={workspaceId} />}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
