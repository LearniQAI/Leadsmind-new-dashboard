'use client';

import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, UserPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createContact } from '@/app/actions/contacts';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';

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
  const [localContacts, setLocalContacts] = useState<Contact[]>(contacts);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Keep local contacts list in sync with parents
  useEffect(() => {
    setLocalContacts(contacts);
  }, [contacts]);

  const selectedContact = localContacts.find(c => c.id === selectedId);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createContact({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source: 'Invoice/Quote Creator',
      });

      if (res.success && res.data) {
        const newContact: Contact = {
          id: res.data.id,
          first_name: res.data.first_name,
          last_name: res.data.last_name,
          email: res.data.email || '',
        };

        // Append to local state list & select instantly
        setLocalContacts(prev => [newContact, ...prev]);
        onChange(newContact.id);

        toast.success(`Client ${newContact.first_name} added successfully!`);

        // Reset form & close
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setIsOpen(false);
      } else {
        toast.error(res.error || 'Failed to create client');
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Bill To Client</label>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-[10px] font-bold text-[var(--accent2)] hover:text-white uppercase tracking-wider flex items-center gap-1 transition-all hover:scale-105"
        >
          <UserPlus size={12} /> + New Client
        </button>
      </div>

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
          {localContacts.map((contact) => (
            <option key={contact.id} value={contact.id} className="bg-[var(--n800)] text-[var(--t1)]">
              {contact.first_name} {contact.last_name} {contact.email ? `(${contact.email})` : ''}
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

      {/* Premium Create Client Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[var(--n800)] z-[1003] border border-[var(--bdrh)] text-[var(--t1)] max-w-md rounded-[var(--r16)] shadow-2xl">
          <form onSubmit={handleCreateContact}>
            <DialogHeader className="space-y-2 mb-6">
              <DialogTitle className="text-xl font-bold font-space uppercase">
                CREATE <span className="text-[var(--accent2)]">CLIENT</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--t3)] uppercase tracking-wider font-semibold">
                Add a new client profile to register documents
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-10 bg-white/[0.03] border border-[var(--bdr)] rounded-[var(--r8)] px-4 text-xs text-[var(--t1)] placeholder:text-[var(--t4)] outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-10 bg-white/[0.03] border border-[var(--bdr)] rounded-[var(--r8)] px-4 text-xs text-[var(--t1)] placeholder:text-[var(--t4)] outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. client@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 bg-white/[0.03] border border-[var(--bdr)] rounded-[var(--r8)] px-4 text-xs text-[var(--t1)] placeholder:text-[var(--t4)] outline-none focus:border-[var(--accent)] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 bg-white/[0.03] border border-[var(--bdr)] rounded-[var(--r8)] px-4 text-xs text-[var(--t1)] placeholder:text-[var(--t4)] outline-none focus:border-[var(--accent)] transition-all"
                />
              </div>
            </div>

            <DialogFooter className="mt-8 gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-ghost flex-1 h-10 text-xs uppercase font-bold tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1 h-10 text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Create Client'
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactSelector;
