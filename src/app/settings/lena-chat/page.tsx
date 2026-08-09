'use client';

import React, { useState } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import { Palette, BookOpen, Users, MessagesSquare, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    { id: 'widget', label: 'Widget Appearance', icon: Palette },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'conversations', label: 'Conversations', icon: MessagesSquare },
    { id: 'embed', label: 'Embed Code', icon: Code2 }
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
        <div className="flex items-center mb-6 bg-white border border-dash-border rounded-2xl px-6 overflow-x-auto no-scrollbar shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2.5 px-6 py-4 text-[12px] font-bold transition-all relative whitespace-nowrap",
                activeTab === tab.id
                  ? "text-dash-accent"
                  : "!text-dash-textMuted hover:!text-dash-text"
              )}
            >
              <tab.icon size={13} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-dash-accent rounded-t-full" />
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
