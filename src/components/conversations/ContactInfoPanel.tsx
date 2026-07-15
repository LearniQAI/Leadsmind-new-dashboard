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
import { Phone, Mail } from 'lucide-react';

interface ContactInfoPanelProps {
  contact: any;
  conversation: any;
}

const DEFAULT_TAGS = ['Sales', 'Support', 'Billing', 'Complaint', 'VIP'];
const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'text-dash-accent bg-dash-accent/10' },
  { value: 'in_progress', label: 'In Progress', color: 'text-amber-600 bg-amber-100' },
  { value: 'waiting_for_client', label: 'Waiting for Client', color: 'text-purple-600 bg-purple-100' },
  { value: 'resolved', label: 'Resolved', color: 'text-green bg-green/10' },
  { value: 'spam', label: 'Spam', color: 'text-red bg-red/10' }
];

export function ContactInfoPanel({ contact, conversation }: ContactInfoPanelProps) {
  const router = useRouter();
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

  // Fetch workspace team members
  useEffect(() => {
    async function loadTeam() {
      const res = await getWorkspaceMembers();
      if (res?.data) {
        setTeamMembers(res.data);
      }
    }
    loadTeam();
  }, [contact?.id]);

  if (!contact) return null;

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
    <div className="w-[240px] border-l border-dash-border flex flex-col bg-white h-full shrink-0 overflow-y-auto no-scrollbar">
      {/* Profile Section */}
      <div className="p-6 flex flex-col items-center text-center border-b border-dash-border">
        <div className="w-16 h-16 rounded-2xl bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-text font-bold text-xl mb-3 overflow-hidden shadow-sm">
          {contact.avatar_url ? (
            <img src={contact.avatar_url} alt={contact.first_name || 'Contact avatar'} className="w-full h-full object-cover" />
          ) : (
            contact.first_name?.[0] || 'U'
          )}
        </div>
        <h3 className="text-[14px] font-bold !text-dash-text mb-0.5">
          {contact.first_name} {contact.last_name}
        </h3>
        <p className="text-[11.5px] !text-dash-textMuted mb-3 break-all px-2">{contact.email || 'No email provided'}</p>

        <div className="flex flex-wrap justify-center gap-1.5">
          <div className="bg-dash-accent/10 text-dash-accent text-[9px] font-bold px-2 py-0.5 rounded-full">
            Lead
          </div>
          <div className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", optedOut ? "bg-red/10 text-red" : "bg-green/10 text-green")}>
            {optedOut ? 'Opted-out' : 'Opted-in'}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-dash-border">
        <h4 className="text-[10px] font-bold !text-dash-text text-center">
          {contact.first_name} {contact.last_name}
        </h4>
      </div>

      <div className="p-4 space-y-5">
        {/* 1. Status Dropdown */}
        <div>
          <label className="block text-[9px] font-bold !text-dash-textMuted mb-2">
            Conversation status
          </label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={cn(
              "w-full border border-dash-border rounded-lg px-2.5 py-1.5 text-[12px] font-semibold focus:outline-none focus:border-dash-accent",
              selectedStatusColor
            )}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-white text-dash-text">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Assignee Selector */}
        <div>
          <label className="block text-[9px] font-bold !text-dash-textMuted mb-2">
            Assigned agent
          </label>
          <select
            value={assignedTo || ''}
            onChange={(e) => handleAssignmentChange(e.target.value || null)}
            className="w-full bg-white border border-dash-border rounded-lg px-2.5 py-1.5 text-[12px] !text-dash-text focus:outline-none focus:border-dash-accent"
          >
            <option value="" className="bg-white !text-dash-textMuted">Unassigned</option>
            {teamMembers.map(member => (
              <option key={member.user?.id} value={member.user?.id} className="bg-white text-dash-text">
                {member.user?.first_name ? `${member.user.first_name} ${member.user.last_name || ''}` : member.user?.email}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Tags Management */}
        <div>
          <label className="block text-[9px] font-bold !text-dash-textMuted mb-2">
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
                    "text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all motion-reduce:transition-none",
                    isActive
                      ? "bg-dash-accent/10 text-dash-accent border-dash-accent/30"
                      : "bg-dash-surface !text-dash-textMuted border-transparent hover:!text-dash-text"
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
              className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-1 text-[11px] !text-dash-text placeholder:!text-dash-textMuted focus:outline-none focus:border-dash-accent"
            />
            <button
              type="submit"
              className="px-2 bg-dash-surface border border-dash-border hover:bg-dash-border/60 !text-dash-text rounded-lg text-[11px] transition-colors motion-reduce:transition-none"
            >
              +
            </button>
          </form>
          {tags.filter(t => !DEFAULT_TAGS.includes(t)).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 border-t border-dash-border pt-2">
              {tags.filter(t => !DEFAULT_TAGS.includes(t)).map(tag => (
                <span
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-600 border border-purple-200 cursor-pointer hover:bg-purple-200 transition-colors motion-reduce:transition-none"
                >
                  {tag} &times;
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. Compliance Overrides */}
        <div className="border-t border-dash-border pt-4">
          <label className="block text-[9px] font-bold !text-dash-textMuted mb-2">
            Compliance & consent
          </label>
          <div className="bg-dash-surface border border-dash-border rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] !text-dash-textMuted">Status</span>
              <span className={cn("text-[11px] font-bold", optedOut ? "text-red" : "text-green")}>
                {optedOut ? 'Marketing blocked' : 'Opted in'}
              </span>
            </div>

            {optOutDate && (
              <div className="text-[10px] !text-dash-textMuted leading-tight">
                Opt-out date: {new Date(optOutDate).toLocaleDateString()}
              </div>
            )}

            <Button
              size="sm"
              onClick={() => handleConsentToggle(!optedOut)}
              className={cn(
                "w-full h-7 text-[10px] font-bold transition-colors motion-reduce:transition-none",
                optedOut
                  ? "bg-green hover:bg-green/90 text-white"
                  : "bg-red hover:bg-red/90 text-white"
              )}
            >
              {optedOut ? 'Manually opt-in' : 'Manually opt-out'}
            </Button>
          </div>
        </div>

        {/* 5. Contact Info Details */}
        <div className="border-t border-dash-border pt-4">
          <label className="block text-[9px] font-bold !text-dash-textMuted mb-2">
            Details
          </label>
          <div className="space-y-2.5 text-[12px]">
            <div className="flex items-center gap-2 !text-dash-textMuted">
              <Phone className="!text-dash-textMuted w-[10px] h-[10px] shrink-0" />
              <span className="truncate">{contact.phone || 'No phone'}</span>
            </div>
            {contact.email && (
              <div className="flex items-center gap-2 !text-dash-textMuted">
                <Mail className="!text-dash-textMuted w-[10px] h-[10px] shrink-0" />
                <span className="truncate break-all">{contact.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
