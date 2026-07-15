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
      <div className="min-h-screen bg-dash-bg px-6 py-6 w-full flex flex-col">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold leading-tight !text-dash-text">
              Lena <span className="text-dash-accent">Chat</span>
            </h1>
            <p className="text-[11.5px] font-medium mt-1 !text-dash-textMuted">
              AI + live agent chatbot for your website
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-dash-border mb-6 gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-[13px] font-medium transition-colors motion-reduce:transition-none relative ${
                activeTab === tab.id
                  ? 'text-dash-accent'
                  : '!text-dash-textMuted hover:!text-dash-text'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-dash-accent" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {!workspaceId ? (
          <div className="p-8 text-center !text-dash-textMuted italic">
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
