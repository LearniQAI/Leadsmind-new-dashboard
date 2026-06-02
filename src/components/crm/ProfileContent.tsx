'use client';

import React, { useState } from 'react';
import { Contact, ContactActivity, ContactNote } from '@/types/crm';
import { cn } from '@/lib/utils';
import { ContactTimeline } from './ContactTimeline';
import { NotesManager } from './NotesManager';
import { TasksManager } from './TasksManager';
import IntelligenceTab from './tabs/IntelligenceTab';
import VerificationTab from './VerificationTab';

interface ProfileContentProps {
  contact: Contact;
  activities: ContactActivity[];
  notes: ContactNote[];
  tasks: any[];
}

export function ProfileContent({ contact, activities, notes, tasks }: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'tasks' | 'intelligence' | 'verification'>('timeline');

  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: 'fa-clock-rotate-left' },
    { id: 'notes', label: 'Notes', icon: 'fa-note-sticky' },
    { id: 'tasks', label: 'Tasks', icon: 'fa-list-check' },
    { id: 'intelligence', label: 'AI Insights', icon: 'fa-brain' },
    { id: 'verification', label: 'Verification', icon: 'fa-shield-check' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#080f28] border border-white/5 rounded-[24px] overflow-hidden shadow-xl">
      <div className="flex items-center px-6 border-b border-white/5 bg-[#080f28]/50 backdrop-blur-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2.5 px-6 py-4 text-[12px] font-bold uppercase tracking-widest transition-all relative",
              activeTab === tab.id 
                ? "text-[#3b82f6]" 
                : "text-[#4a5a82] hover:text-[#eef2ff]"
            )}
          >
            <i className={cn("fa-solid text-[13px]", tab.icon)}></i>
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-[#2563eb] rounded-t-full shadow-[0_-4px_10px_rgba(37,99,235,0.5)]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8 common-scrollbar bg-[#04091a]/20">
        {activeTab === 'timeline' && (
          <div className="max-w-2xl">
            <ContactTimeline activities={activities} />
          </div>
        )}
        
        {activeTab === 'notes' && (
          <NotesManager contactId={contact.id} notes={notes} />
        )}

        {activeTab === 'tasks' && (
          <TasksManager contactId={contact.id} tasks={tasks} />
        )}

        {activeTab === 'intelligence' && (
          <IntelligenceTab 
            contactId={contact.id} 
            workspaceId={contact.workspace_id} 
            companyDomain={(contact as any).metadata?.company_domain || 'zafrologistics.co.za'}
          />
        )}

        {activeTab === 'verification' && (
          <VerificationTab 
            contactId={contact.id} 
            workspaceId={contact.workspace_id} 
            contactName={`${contact.first_name} ${contact.last_name}`}
          />
        )}
      </div>
    </div>
  );
}
