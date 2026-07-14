'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ConversationListProps {
  conversations: any[];
  activeId: string | null;
  onSelect: (id: string) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (filter: string) => void;
}

const CHANNELS = [
  { id: 'all', icon: 'fa-solid fa-layer-group', label: 'All' },
  { id: 'sms', icon: 'fa-solid fa-comment-dots', label: 'SMS' },
  { id: 'email', icon: 'fa-solid fa-envelope', label: 'Email' },
  { id: 'facebook', icon: 'fa-brands fa-facebook-messenger', label: 'Facebook' },
  { id: 'instagram', icon: 'fa-brands fa-instagram', label: 'Instagram' },
  { id: 'whatsapp', icon: 'fa-brands fa-whatsapp', label: 'WhatsApp' },
];

const STATUS_PILLS: Record<string, string> = {
  open: 'bg-dash-accent/10 text-dash-accent border-dash-accent/20',
  in_progress: 'bg-amber/10 text-amber border-amber/20',
  waiting_for_client: 'bg-purple/10 text-purple border-purple/20',
  resolved: 'bg-green/10 text-green border-green/20',
  spam: 'bg-red/10 text-red border-red/20'
};

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  assigneeFilter,
  onAssigneeFilterChange
}: ConversationListProps) {

  return (
    <div className="w-[300px] border-r border-dash-border flex flex-col bg-dash-surface h-full shrink-0">
      {/* Header & Tabs */}
      <div className="p-4 border-b border-dash-border space-y-3">
        {/* 1. Search Input at Top */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] !text-dash-textMuted"></i>
          <input
            type="text"
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white border border-dash-border rounded-xl pl-9 pr-4 py-1.5 text-[12px] !text-dash-text placeholder:!text-dash-textMuted focus:outline-none focus:border-dash-accent transition-all motion-reduce:transition-none"
          />
        </div>

        {/* 2. Channel Filter Scroll (Pill buttons: icon + text) */}
        <div className="flex gap-1.5 overflow-x-auto common-scrollbar pb-1.5">
          {CHANNELS.map(c => (
            <button
              key={c.id}
              onClick={() => onFilterChange(c.id)}
              className={cn(
                "px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all motion-reduce:transition-none shrink-0 text-[10px] font-semibold",
                filter === c.id
                  ? "bg-dash-accent text-white"
                  : "bg-white border border-dash-border !text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/40"
              )}
            >
              <i className={cn(c.icon, "text-[10px]")}></i>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* 3. Slimmer Assignee Segment Control (height 28px) */}
        <div className="grid grid-cols-3 bg-white p-0.5 rounded-lg border border-dash-border text-[9.5px] h-7">
          <button
            onClick={() => onAssigneeFilterChange('all')}
            className={cn(
              "font-bold rounded-md transition-all motion-reduce:transition-none h-full flex items-center justify-center",
              assigneeFilter === 'all' ? "bg-dash-accent text-white" : "!text-dash-textMuted hover:!text-dash-text"
            )}
          >
            All
          </button>
          <button
            onClick={() => onAssigneeFilterChange('me')}
            className={cn(
              "font-bold rounded-md transition-all motion-reduce:transition-none h-full flex items-center justify-center",
              assigneeFilter === 'me' ? "bg-dash-accent text-white" : "!text-dash-textMuted hover:!text-dash-text"
            )}
          >
            Mine
          </button>
          <button
            onClick={() => onAssigneeFilterChange('unassigned')}
            className={cn(
              "font-bold rounded-md transition-all motion-reduce:transition-none h-full flex items-center justify-center",
              assigneeFilter === 'unassigned' ? "bg-dash-accent text-white" : "!text-dash-textMuted hover:!text-dash-text"
            )}
          >
            Unassigned
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto common-scrollbar">
        {conversations.map(conv => {
          const isActive = activeId === conv.id;
          const sortedMessages = conv.messages?.slice().sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
          const latestMessage = sortedMessages?.[0];
          const unread = conv.unread_count > 0;

          // Compute SLA breached state for indicators
          let isBreached = false;
          if (latestMessage && latestMessage.direction === 'inbound') {
            const diffMins = (Date.now() - new Date(latestMessage.sent_at).getTime()) / (1000 * 60);
            if (diffMins > 15) {
              isBreached = true;
            }
          }

          const status = conv.status || 'open';

          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "p-4 border-b border-dash-border cursor-pointer transition-all motion-reduce:transition-none relative group",
                isActive
                  ? "bg-dash-accent/5 border-l-[3px] border-l-dash-accent"
                  : "hover:bg-dash-border/20 border-l-[3px] border-l-transparent"
              )}
            >
              {unread && (
                <div className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-dash-accent" />
              )}

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-white border border-dash-border flex items-center justify-center !text-dash-text font-bold text-[12px] shrink-0 overflow-hidden mt-0.5">
                  {conv.contacts?.avatar_url ? (
                    <img src={conv.contacts.avatar_url} alt={conv.contacts?.first_name || 'Contact avatar'} className="w-full h-full object-cover" />
                  ) : (
                    conv.contacts?.first_name?.[0] || 'U'
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className="text-[13px] font-semibold !text-dash-text truncate">
                      {conv.contacts ? `${conv.contacts.first_name} ${conv.contacts.last_name}` : conv.title}
                    </h4>
                    <span className="text-[10px] !text-dash-textMuted font-semibold shrink-0 ml-2">
                      {format(new Date(conv.last_message_at), 'hh:mm a')}
                    </span>
                  </div>

                  <p className="text-[11px] !text-dash-textMuted truncate mb-1.5">
                    {latestMessage?.content || 'No messages yet'}
                  </p>

                  {/* Status & SLA badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Status Pill */}
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize", STATUS_PILLS[status])}>
                      {status.replace('_', ' ')}
                    </span>

                    {/* SLA alert */}
                    {isBreached && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red/10 text-red border border-red/20 animate-pulse motion-reduce:animate-none">
                        Overdue
                      </span>
                    )}

                    {/* First tag display */}
                    {conv.tags && conv.tags.length > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple/10 text-purple border border-purple/20">
                        {conv.tags[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
