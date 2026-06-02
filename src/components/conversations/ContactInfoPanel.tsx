'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { getWorkspaceMembers } from '@/app/actions/settings';
import { 
  updateConversationAssignment, 
  updateConversationStatus, 
  updateConversationTags, 
  updateContactConsent 
} from '@/app/actions/messaging';
import { toast } from 'sonner';

interface ContactInfoPanelProps {
  contact: any;
  conversation: any;
}

const DEFAULT_TAGS = ['Sales', 'Support', 'Billing', 'Complaint', 'VIP'];
const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'text-blue-400 bg-blue-500/10' },
  { value: 'in_progress', label: 'In Progress', color: 'text-amber-400 bg-amber-500/10' },
  { value: 'waiting_for_client', label: 'Waiting for Client', color: 'text-purple-400 bg-purple-500/10' },
  { value: 'resolved', label: 'Resolved', color: 'text-emerald-400 bg-emerald-500/10' },
  { value: 'spam', label: 'Spam', color: 'text-red-400 bg-red-500/10' }
];

export function ContactInfoPanel({ contact, conversation }: ContactInfoPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'tickets'>('info');
  const [tickets, setTickets] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // Controls state
  const [assignedTo, setAssignedTo] = useState<string | null>(conversation?.assigned_to || null);
  const [status, setStatus] = useState<string>(conversation?.status || 'open');
  const [tags, setTags] = useState<string[]>(conversation?.tags || []);
  const [customTagInput, setCustomTagInput] = useState('');
  
  // Consent state
  const [optedIn, setOptedIn] = useState<boolean>(contact?.opted_in ?? true);
  const [optedOut, setOptedOut] = useState<boolean>(contact?.opted_out ?? false);
  const [optOutDate, setOptOutDate] = useState<string | null>(contact?.opt_out_date || null);

  // Sync state with selected conversation
  useEffect(() => {
    if (conversation) {
      setAssignedTo(conversation.assigned_to || null);
      setStatus(conversation.status || 'open');
      setTags(conversation.tags || []);
    }
  }, [conversation]);

  // Sync compliance status with contact
  useEffect(() => {
    if (contact) {
      setOptedIn(contact.opted_in ?? true);
      setOptedOut(contact.opted_out ?? false);
      setOptOutDate(contact.opt_out_date || null);
    }
  }, [contact]);

  // Fetch tickets and workspace team members
  useEffect(() => {
    if (contact?.id) {
      import('@supabase/supabase-js').then(({ createClient }) => {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        supabase.from('support_tickets').select('*').eq('contact_id', contact.id)
          .then(({ data }) => setTickets(data || []));
      });
    }

    async function loadTeam() {
      const res = await getWorkspaceMembers();
      if (res?.data) {
        setTeamMembers(res.data);
      }
    }
    loadTeam();
  }, [contact?.id]);

  if (!contact) return null;

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const closedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  const handleAssignmentChange = async (userId: string | null) => {
    setAssignedTo(userId);
    const res = await updateConversationAssignment(conversation.id, userId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(userId ? 'Conversation assigned' : 'Conversation unassigned');
      router.refresh();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    const res = await updateConversationStatus(conversation.id, newStatus);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      router.refresh();
    }
  };

  const handleToggleTag = async (tag: string) => {
    const updatedTags = tags.includes(tag)
      ? tags.filter(t => t !== tag)
      : [...tags, tag];
    
    setTags(updatedTags);
    const res = await updateConversationTags(conversation.id, updatedTags);
    if (res.error) {
      toast.error(res.error);
    } else {
      router.refresh();
    }
  };

  const handleAddCustomTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTagInput.trim()) return;
    const newTag = customTagInput.trim();
    if (!tags.includes(newTag)) {
      const updatedTags = [...tags, newTag];
      setTags(updatedTags);
      const res = await updateConversationTags(conversation.id, updatedTags);
      if (res.error) {
        toast.error(res.error);
      } else {
        router.refresh();
      }
    }
    setCustomTagInput('');
  };

  const handleConsentToggle = async (shouldOptOut: boolean) => {
    const newOptIn = !shouldOptOut;
    const newOptOut = shouldOptOut;
    setOptedIn(newOptIn);
    setOptedOut(newOptOut);
    const nowStr = shouldOptOut ? new Date().toISOString() : null;
    setOptOutDate(nowStr);

    const res = await updateContactConsent(contact.id, newOptIn, newOptOut);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(shouldOptOut ? 'Contact opted out' : 'Contact opted in');
      router.refresh();
    }
  };

  const selectedStatusColor = STATUS_OPTIONS.find(o => o.value === status)?.color || '';

  return (
    <div className="w-[240px] border-l border-white/5 flex flex-col bg-[#080f28] h-full shrink-0 overflow-y-auto no-scrollbar">
      {/* Profile Section */}
      <div className="p-6 flex flex-col items-center text-center border-b border-white/5">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#eef2ff] font-bold text-xl mb-3 font-space-grotesk overflow-hidden shadow-2xl">
          {contact.avatar_url ? (
            <img src={contact.avatar_url} className="w-full h-full object-cover" />
          ) : (
            contact.first_name?.[0] || 'U'
          )}
        </div>
        <h3 className="text-[14px] font-bold text-[#eef2ff] font-space-grotesk mb-0.5">
          {contact.first_name} {contact.last_name}
        </h3>
        <p className="text-[11.5px] text-[#4a5a82] font-dm-sans mb-3 break-all px-2">{contact.email || 'No email provided'}</p>
        
        <div className="flex flex-wrap justify-center gap-1.5">
          <div className="bg-[#2563eb]/15 text-[#3b82f6] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-dm-sans">
            Lead
          </div>
          <div className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-dm-sans", optedOut ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400")}>
            {optedOut ? 'Opted-Out' : 'Opted-In'}
          </div>
        </div>
      </div>

      <div className="flex border-b border-white/5">
        <button 
          onClick={() => setActiveTab('info')}
          className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-wider", activeTab === 'info' ? "text-[#eef2ff] border-b-2 border-[#3b82f6]" : "text-[#4a5a82] hover:text-[#94a3c8]")}
        >
          Control Panel
        </button>
        <button 
          onClick={() => setActiveTab('tickets')}
          className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1", activeTab === 'tickets' ? "text-[#eef2ff] border-b-2 border-[#3b82f6]" : "text-[#4a5a82] hover:text-[#94a3c8]")}
        >
          Tickets
          {tickets.length > 0 && (
            <span className="bg-[#3b82f6] text-white text-[8px] px-1.5 py-0.5 rounded-full">{tickets.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'info' ? (
        <div className="p-4 space-y-5">
          {/* 1. Status Dropdown */}
          <div>
            <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-2 font-dm-sans">
              Conversation Status
            </label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={cn(
                "w-full bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold focus:outline-none",
                selectedStatusColor
              )}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#080f28] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Assignee Selector */}
          <div>
            <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-2 font-dm-sans">
              Assigned Agent
            </label>
            <select
              value={assignedTo || ''}
              onChange={(e) => handleAssignmentChange(e.target.value || null)}
              className="w-full bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5 text-[12px] text-[#eef2ff] focus:outline-none"
            >
              <option value="" className="bg-[#080f28] text-[#4a5a82]">Unassigned</option>
              {teamMembers.map(member => (
                <option key={member.user?.id} value={member.user?.id} className="bg-[#080f28] text-white">
                  {member.user?.first_name ? `${member.user.first_name} ${member.user.last_name || ''}` : member.user?.email}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Tags Management */}
          <div>
            <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-2 font-dm-sans">
              Tags
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {DEFAULT_TAGS.map(tag => {
                const isActive = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => handleToggleTag(tag)}
                    className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all",
                      isActive 
                        ? "bg-[#2563eb]/20 text-[#3b82f6] border-[#2563eb]/30" 
                        : "bg-white/5 text-[#4a5a82] border-transparent hover:text-white"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            
            {/* Custom Tag Form */}
            <form onSubmit={handleAddCustomTag} className="flex gap-1">
              <input
                type="text"
                placeholder="Add custom tag..."
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-[11px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none"
              />
              <button
                type="submit"
                className="px-2 bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-lg text-[11px]"
              >
                +
              </button>
            </form>
            {tags.filter(t => !DEFAULT_TAGS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 border-t border-white/5 pt-2">
                {tags.filter(t => !DEFAULT_TAGS.includes(t)).map(tag => (
                  <span
                    key={tag}
                    onClick={() => handleToggleTag(tag)}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 cursor-pointer hover:bg-purple-500/20"
                  >
                    {tag} &times;
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4. Compliance Overrides */}
          <div className="border-t border-white/5 pt-4">
            <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-2 font-dm-sans">
              Compliance & Consent
            </label>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] text-[#94a3c8]">Status</span>
                <span className={cn("text-[11px] font-bold", optedOut ? "text-red-400" : "text-emerald-400")}>
                  {optedOut ? 'Marketing Blocked' : 'Opted In'}
                </span>
              </div>
              
              {optOutDate && (
                <div className="text-[10px] text-[#4a5a82] leading-tight">
                  Opt-out date: {new Date(optOutDate).toLocaleDateString()}
                </div>
              )}

              <Button
                size="sm"
                onClick={() => handleConsentToggle(!optedOut)}
                className={cn(
                  "w-full h-7 text-[10px] font-bold uppercase tracking-wider",
                  optedOut 
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                    : "bg-red-500 hover:bg-red-600 text-white"
                )}
              >
                {optedOut ? 'Manually Opt-In' : 'Manually Opt-Out'}
              </Button>
            </div>
          </div>

          {/* 5. Contact Info Details */}
          <div className="border-t border-white/5 pt-4">
            <label className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-2 font-dm-sans">
              Details
            </label>
            <div className="space-y-2.5 text-[12px]">
              <div className="flex items-center gap-2 text-[#94a3c8]">
                <i className="fa-solid fa-phone text-[#4a5a82] text-[10px] w-4"></i>
                <span className="truncate">{contact.phone || 'No phone'}</span>
              </div>
              {contact.email && (
                <div className="flex items-center gap-2 text-[#94a3c8]">
                  <i className="fa-solid fa-envelope text-[#4a5a82] text-[10px] w-4"></i>
                  <span className="truncate break-all">{contact.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
              <span className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-widest mb-1">Open</span>
              <span className="block text-lg font-black text-amber-500">{openTickets}</span>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
              <span className="block text-[9px] font-bold text-[#4a5a82] uppercase tracking-widest mb-1">Closed</span>
              <span className="block text-lg font-black text-emerald-500">{closedTickets}</span>
            </div>
          </div>
          
          <div>
            <h4 className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-3 font-dm-sans">
              History
            </h4>
            {tickets.length === 0 ? (
              <p className="text-[11px] text-[#4a5a82] text-center py-4">No tickets found</p>
            ) : (
              <div className="space-y-2.5">
                {tickets.map(t => (
                  <div key={t.id} className="bg-white/5 border border-white/5 rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#94a3c8]">{t.status}</span>
                      <span className="text-[9px] text-[#4a5a82]">{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11.5px] font-medium text-white truncate">{t.title}</p>
                    <Button variant="link" className="h-auto p-0 text-[9px] text-[#3b82f6] mt-1.5" onClick={() => router.push(`/support/tickets-reply?id=${t.id}`)}>View Ticket</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
