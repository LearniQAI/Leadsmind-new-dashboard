'use client';

import React, { useState } from 'react';
import { Contact, ContactActivity, ContactNote } from '@/types/crm';
import { cn } from '@/lib/utils';
import { History, StickyNote, ListChecks, Sparkles, ShieldCheck, Network, type LucideIcon } from 'lucide-react';
import { ContactTimeline } from './ContactTimeline';
import { NotesManager } from './NotesManager';
import { TasksManager } from './TasksManager';
import IntelligenceTab from './tabs/IntelligenceTab';
import VerificationTab from './VerificationTab';
import { BeneficialOwnershipTab } from './BeneficialOwnershipTab';

interface ProfileContentProps {
  contact: Contact;
  activities: ContactActivity[];
  notes: ContactNote[];
  tasks: any[];
}

export function ProfileContent({ contact, activities, notes, tasks }: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'tasks' | 'intelligence' | 'verification' | 'beneficial_ownership'>('timeline');

  const tabs: { id: string; label: string; icon: LucideIcon }[] = [
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'tasks', label: 'Tasks', icon: ListChecks },
    { id: 'intelligence', label: 'AI Insights', icon: Sparkles },
    { id: 'verification', label: 'Verification', icon: ShieldCheck },
    { id: 'beneficial_ownership', label: 'Beneficial Ownership', icon: Network },
  ];

  return (
    <div className="flex-1 flex flex-col bg-white border border-dash-border rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center px-6 border-b border-dash-border bg-white/50 backdrop-blur-xl overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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

      <div className="flex-1 overflow-y-auto p-8 common-scrollbar bg-dash-surface/20">
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
            contactIdNumber={contact.id_number ?? undefined}
          />
        )}

        {activeTab === 'beneficial_ownership' && (
          <BeneficialOwnershipTab 
            contact={contact}
          />
        )}
      </div>
    </div>
  );
}

