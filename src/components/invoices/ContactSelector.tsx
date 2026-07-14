'use client';

import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, UserPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createContact } from '@/app/actions/contacts';
import { toast } from 'sonner';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalDescription, DashModalFooter
} from '@/components/dashboard-ui/Modal';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';

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
        <label className="text-[13px] font-semibold !text-dash-text">Bill to client</label>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-[11px] font-bold text-dash-accent hover:text-dash-accent/80 flex items-center gap-1 transition-colors motion-reduce:transition-none"
        >
          <UserPlus size={12} /> New client
        </button>
      </div>

      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 !text-dash-textMuted group-focus-within:text-dash-accent transition-colors motion-reduce:transition-none">
          <Users size={16} />
        </div>
        <select
          value={selectedId || ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full h-12 bg-white border border-dash-border rounded-xl pl-12 pr-10 text-sm !text-dash-text outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none appearance-none cursor-pointer",
            !selectedId && "!text-dash-textMuted"
          )}
        >
          <option value="" disabled>Select a client...</option>
          {localContacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.first_name} {contact.last_name} {contact.email ? `(${contact.email})` : ''}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 !text-dash-textMuted pointer-events-none">
          <ChevronDown size={16} />
        </div>
      </div>

      {selectedContact && (
        <div className="mt-2 p-3 rounded-lg bg-dash-accent/5 border border-dash-accent/10 animate-in fade-in slide-in-from-top-1 duration-300 motion-reduce:animate-none">
          <p className="text-[10px] font-bold text-dash-accent">Active client</p>
          <p className="text-xs font-bold !text-dash-text mt-0.5">{selectedContact.first_name} {selectedContact.last_name}</p>
        </div>
      )}

      {/* Create Client Dialog */}
      <DashModal open={isOpen} onOpenChange={setIsOpen}>
        <DashModalContent className="max-w-md">
          <form onSubmit={handleCreateContact}>
            <DashModalHeader>
              <DashModalTitle>Create client</DashModalTitle>
              <DashModalDescription>
                Add a new client profile to register documents
              </DashModalDescription>
            </DashModalHeader>

            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <DashFormField label="First name" required>
                  <DashInput
                    type="text"
                    required
                    placeholder="e.g. John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10"
                  />
                </DashFormField>
                <DashFormField label="Last name" required>
                  <DashInput
                    type="text"
                    required
                    placeholder="e.g. Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10"
                  />
                </DashFormField>
              </div>

              <DashFormField label="Email address">
                <DashInput
                  type="email"
                  placeholder="e.g. client@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                />
              </DashFormField>

              <DashFormField label="Phone number">
                <DashInput
                  type="tel"
                  placeholder="e.g. +1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10"
                />
              </DashFormField>
            </div>

            <DashModalFooter>
              <DashButton type="button" variant="secondary" className="flex-1" onClick={() => setIsOpen(false)}>
                Cancel
              </DashButton>
              <DashButton type="submit" variant="primary" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Create client'
                )}
              </DashButton>
            </DashModalFooter>
          </form>
        </DashModalContent>
      </DashModal>
    </div>
  );
};

export default ContactSelector;
