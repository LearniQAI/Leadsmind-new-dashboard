import React from 'react';
import InboxClient from './InboxClient';
import { getConversations } from '@/app/actions/messaging';

export default async function InboxPage() {
  const { data: conversations, error } = await getConversations();

  return (
    <div className="p-6 h-[calc(100vh-100px)] font-body flex flex-col bg-[#0A0F3D] rounded-3xl shadow-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Unified <span className="text-primary">Inbox</span></h1>
        <p className="text-white/40 text-sm font-medium">Manage Email, SMS, and Social messages in one place.</p>
      </div>

      {error ? (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger">
          {error}
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-[#0b0b1a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <InboxClient initialConversations={conversations || []} />
        </div>
      )}
    </div>
  );
}
