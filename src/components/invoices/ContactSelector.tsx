'use client';

import React from 'react';
import { Users, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ContactSelectorProps {
  contacts: Contact[];
  selectedId?: string;
  onChange: (id: string) => void;
}

const ContactSelector: React.FC<ContactSelectorProps> = ({
  contacts,
  selectedId,
  onChange,
}) => {
  const selectedContact = contacts.find(c => c.id === selectedId);

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Bill To Client</label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--t4)] group-focus-within:text-[var(--accent2)] transition-colors">
          <Users size={16} />
        </div>
        <select
          value={selectedId || ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full h-12 bg-[var(--n800)] border border-[var(--bdr)] rounded-[var(--r12)] pl-12 pr-10 text-sm text-[var(--t1)] outline-none focus:border-[var(--accent)] transition-all appearance-none cursor-pointer",
            !selectedId && "text-[var(--t4)]"
          )}
        >
          <option value="" disabled>Select a client...</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id} className="bg-[var(--n800)] text-[var(--t1)]">
              {contact.first_name} {contact.last_name} ({contact.email})
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--t4)] pointer-events-none">
          <ChevronDown size={16} />
        </div>
      </div>
      {selectedContact && (
        <div className="mt-2 p-3 rounded-[var(--r8)] bg-[var(--accentg)] border border-[var(--accent)]/10 animate-in fade-in slide-in-from-top-1 duration-300">
           <p className="text-[10px] font-black text-[var(--accent2)] uppercase tracking-widest">Active Client</p>
           <p className="text-xs font-bold text-[var(--t1)] mt-0.5">{selectedContact.first_name} {selectedContact.last_name}</p>
        </div>
      )}
    </div>
  );
};

export default ContactSelector;
