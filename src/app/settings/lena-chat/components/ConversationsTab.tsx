'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Conversation {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  page_url: string | null;
  status: 'active' | 'waiting_agent' | 'with_agent' | 'resolved';
  mode: 'ai' | 'human';
  lead_captured: boolean;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at: string;
  assigned_agent?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role_label: string | null;
  } | null;
}

interface Message {
  id: string;
  sender_type: 'visitor' | 'ai' | 'agent' | 'system';
  sender_id: string | null;
  content: string;
  created_at: string;
}

interface Agent {
  id: string;
  display_name: string;
}

interface ConversationsTabProps {
  workspaceId: string;
}

export default function ConversationsTab({ workspaceId }: ConversationsTabProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`/api/lena/conversations?workspaceId=${workspaceId}&status=${activeStatus}`);
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
        // Refresh selected conversation details if open
        if (selectedConv) {
          const fresh = (data.conversations || []).find((c: Conversation) => c.id === selectedConv.id);
          if (fresh) setSelectedConv(fresh);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/lena/messages?conversationId=${convId}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchAgentsList = async () => {
    try {
      const res = await fetch(`/api/lena/agents?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (res.ok && data.agents?.length > 0) {
        setAgents(data.agents);
        setSelectedAgentId(data.agents[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchAgentsList();
    
    // Set up polling interval for active chats list and current thread
    const interval = setInterval(() => {
      fetchConversations();
    }, 4000);

    return () => clearInterval(interval);
  }, [workspaceId, activeStatus]);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
      const msgInterval = setInterval(() => {
        fetchMessages(selectedConv.id);
      }, 3000);
      return () => clearInterval(msgInterval);
    }
  }, [selectedConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReplyText(e.target.value);

    if (!selectedConv) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current > 3000) {
      lastTypingSentRef.current = now;
      const typingUntil = new Date(now + 6000).toISOString();
      fetch(`/api/lena/conversations?id=${selectedConv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_typing_until: typingUntil })
      }).catch(err => console.error('Failed to update agent typing status:', err));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConv) return;
    setSending(true);

    try {
      const res = await fetch('/api/lena/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          workspaceId,
          content: replyText,
          senderId: selectedAgentId
        })
      });

      if (res.ok) {
        setReplyText('');
        // Immediately reset agent typing status in db
        fetch(`/api/lena/conversations?id=${selectedConv.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_typing_until: new Date(0).toISOString() })
        }).catch(err => console.error('Failed to reset agent typing status:', err));

        fetchMessages(selectedConv.id);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleTakeOver = async () => {
    if (!selectedConv || !selectedAgentId) return;
    try {
      const res = await fetch(`/api/lena/conversations?id=${selectedConv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'human',
          status: 'with_agent',
          assigned_agent_id: selectedAgentId
        })
      });
      if (res.ok) {
        fetchConversations();
      }
    } catch (err) {
      console.error('Takeover failed:', err);
    }
  };

  const handleResolve = async () => {
    if (!selectedConv) return;
    try {
      const res = await fetch(`/api/lena/conversations?id=${selectedConv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved'
        })
      });
      if (res.ok) {
        fetchConversations();
      }
    } catch (err) {
      console.error('Resolution failed:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting_agent':
        return 'bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/25';
      case 'with_agent':
        return 'bg-[#2563eb]/15 text-[#60a5fa] border-[#2563eb]/25';
      case 'resolved':
        return 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]/25';
      default:
        return 'bg-white/5 text-[#94a3c8] border-white/10';
    }
  };

  if (loading && conversations.length === 0) {
    return <div className="h-40 bg-white/[0.02] animate-pulse rounded-xl" />;
  }

  return (
    <div className="flex border border-[rgba(255,255,255,0.07)] bg-[rgba(12,21,53,0.85)] rounded-xl overflow-hidden min-h-[500px] max-h-[620px] w-full">
      {/* Left panel: List */}
      <div className="w-[300px] border-right border-[rgba(255,255,255,0.07)] flex flex-col flex-shrink-0 bg-[#080f28]">
        {/* Filters */}
        <div className="p-3 border-b border-[rgba(255,255,255,0.07)] space-y-2">
          <span className="text-[11px] font-bold text-[#4a5a82] uppercase tracking-[0.5px]">
            Filter Chats
          </span>
          <div className="flex flex-wrap gap-1.5">
            {['all', 'active', 'waiting_agent', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setActiveStatus(st)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                  activeStatus === st
                    ? 'bg-[#2563eb] text-white border-[#2563eb]'
                    : 'bg-white/5 text-[#94a3c8] border-white/5 hover:text-white'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[rgba(255,255,255,0.04)]">
          {conversations.length === 0 ? (
            <p className="text-[11.5px] text-[#4a5a82] text-center italic py-8">
              No conversations found.
            </p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedConv(c)}
                className={`p-3.5 cursor-pointer transition-colors relative ${
                  selectedConv?.id === c.id
                    ? 'bg-[rgba(37,99,235,0.14)] border-l-2 border-[#2563eb]'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[12px] font-semibold text-[#eef2ff] font-space-grotesk truncate">
                    {c.visitor_name || c.visitor_id.substring(0, 12)}
                  </span>
                  <span className="text-[9px] text-[#4a5a82] flex-shrink-0">
                    {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-[10.5px] text-[#94a3c8] truncate mt-1">
                  {c.visitor_email || 'No email captured'}
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${getStatusBadge(c.status)}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                  <span className="text-[9.5px] text-[#4a5a82]">
                    Mode: {c.mode.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel: Details & Thread */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c1535]/35">
        {selectedConv ? (
          <>
            {/* Header info */}
            <div className="p-4 border-b border-[rgba(255,255,255,0.07)] flex items-center justify-between gap-4 flex-shrink-0 bg-[#080f28]">
              <div className="min-w-0">
                <span className="text-[14px] font-bold text-white font-space-grotesk">
                  {selectedConv.visitor_name || 'Anonymous Visitor'}
                </span>
                <div className="text-[11px] text-[#94a3c8] mt-0.5 flex gap-2.5">
                  <span>ID: {selectedConv.visitor_id.substring(0, 16)}</span>
                  {selectedConv.visitor_email && <span>• {selectedConv.visitor_email}</span>}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                {selectedConv.status !== 'resolved' && (
                  <button
                    onClick={handleResolve}
                    className="bg-[#10b981]/10 hover:bg-[#10b981]/25 border border-[#10b981]/25 text-[#34d399] text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}

                {selectedConv.mode === 'ai' && agents.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="bg-[#111d47] border border-white/5 text-[11.5px] px-2 py-1.5 rounded-lg text-[#eef2ff]"
                    >
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.display_name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleTakeOver}
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Take Over
                    </button>
                  </div>
                )}

                {selectedConv.assigned_agent && (
                  <span className="text-[11px] text-[#94a3c8]">
                    Assigned: {selectedConv.assigned_agent.display_name}
                  </span>
                )}
              </div>
            </div>

            {/* Messages feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[75%] p-3 rounded-xl text-[12.5px] leading-relaxed flex flex-col ${
                    m.sender_type === 'visitor'
                      ? 'bg-[rgba(37,99,235,0.14)] border border-[rgba(37,99,235,0.2)] text-white self-end'
                      : 'bg-white/5 border border-white/[0.04] text-[#eef2ff] self-start'
                  }`}
                >
                  <span className="text-[9.5px] text-[#4a5a82] font-semibold mb-1 uppercase">
                    {m.sender_type.toUpperCase()}
                  </span>
                  <span>{m.content}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply bar */}
            {selectedConv.status !== 'resolved' ? (
              <form onSubmit={handleSend} className="p-3 border-t border-[rgba(255,255,255,0.07)] flex gap-2 bg-[#080f28] flex-shrink-0">
                <input
                  type="text"
                  placeholder="Type a message to reply..."
                  value={replyText}
                  onChange={handleInputChange}
                  className="flex-1 bg-white/[0.05] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2 text-white text-[13px] focus:outline-none focus:border-[#2563eb]"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            ) : (
              <div className="p-3.5 bg-black/20 border-t border-[rgba(255,255,255,0.07)] text-center text-[12px] text-[#4a5a82] italic">
                This conversation is resolved. Reopen by sending a message or taking over.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2">
            <span className="text-[32px] opacity-40">💬</span>
            <span className="text-[13px] font-semibold text-[#94a3c8]">Select a Conversation</span>
            <p className="text-[11.5px] text-[#4a5a82] max-w-[240px]">
              Choose a visitor conversation from the left panel to review messages and coordinate replies.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
