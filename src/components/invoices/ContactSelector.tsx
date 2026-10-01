'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Users, ChevronDown, UserPlus, Loader2, AlertTriangle } from 'lucide-react';
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
  email: string | null;
}

interface ContactSelectorProps {
  contacts: Contact[];
  selectedId?: string;
  onChange: (id: string) => void;
  /** Called with the full record when a client is created here (or an existing one is picked from the
   * duplicate prompt), so the parent can use its email without waiting for a page refresh. */
  onContactAvailable?: (contact: Contact) => void;
}

const CREATE_TIMEOUT_MS = 30_000;

type FormError =
  | { kind: 'duplicate'; existing: Contact }
  | { kind: 'failure'; message: string }
  | null;

const ContactSelector: React.FC<ContactSelectorProps> = ({
  contacts,
  selectedId,
  onChange,
  onContactAvailable,
}) => {
  const [localContacts, setLocalContacts] = useState<Contact[]>(contacts);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false); // ignores a second submit in the same tick, before React re-renders
  const [formError, setFormError] = useState<FormError>(null);

  // One operation id per modal open. Reused verbatim on every retry/double-submit of the same form so the server
  // returns the client it already created; replaced after a success and on each reopen.
  const operationIdRef = useRef<string>(crypto.randomUUID());

  // Form Fields State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Keep the list in sync with the parent WITHOUT dropping a client created here that the parent's (server-fetched)
  // list doesn't contain yet.
  useEffect(() => {
    setLocalContacts((prev) => {
      const known = new Set(contacts.map((c) => c.id));
      return [...prev.filter((c) => !known.has(c.id)), ...contacts];
    });
  }, [contacts]);

  const selectedContact = localContacts.find(c => c.id === selectedId);

  const openModal = () => {
    operationIdRef.current = crypto.randomUUID();
    setFormError(null);
    setIsOpen(true);
  };

  const selectExisting = (existing: Contact) => {
    setLocalContacts((prev) => (prev.some((c) => c.id === existing.id) ? prev : [existing, ...prev]));
    onContactAvailable?.(existing);
    onChange(existing.id);
    toast.success(`Selected existing client ${existing.first_name} ${existing.last_name}`.trim());
    resetAndClose();
  };

  const resetAndClose = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setFormError(null);
    setIsOpen(false);
  };

  const handleCreateContact = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submittingRef.current) return;
    if (!firstName.trim() || !lastName.trim()) {
      setFormError({ kind: 'failure', message: 'First name and last name are required.' });
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await Promise.race([
        createContact({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          source: 'Invoice/Quote Creator',
          clientOperationId: operationIdRef.current,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), CREATE_TIMEOUT_MS)),
      ]);

      if (res.success) {
        const newContact: Contact = {
          id: res.data.id,
          first_name: res.data.first_name,
          last_name: res.data.last_name,
          email: res.data.email || null,
        };

        // Append to local state list & select instantly
        setLocalContacts(prev => [newContact, ...prev.filter((c) => c.id !== newContact.id)]);
        onContactAvailable?.(newContact);
        onChange(newContact.id);
        toast.success(`Client ${newContact.first_name} added.`);
        operationIdRef.current = crypto.randomUUID(); // consumed
        resetAndClose();
      } else {
        const failure = res as { error?: string; code?: string; existing?: Contact };
        if (failure.code === 'DUPLICATE_EMAIL' && failure.existing) {
          // Not a failure to retry: offer the client that already has this email.
          setFormError({ kind: 'duplicate', existing: { ...failure.existing, email: failure.existing.email ?? email.trim() } });
        } else {
          setFormError({ kind: 'failure', message: failure.error || 'Could not create the client. Please try again.' });
        }
      }
    } catch (err: any) {
      setFormError({
        kind: 'failure',
        message: err?.message === 'timeout'
          ? 'This is taking longer than expected. Your details are kept — press Create client to retry; it will not create a duplicate.'
          : 'Network problem — your details are kept. Check your connection and press Create client to retry.',
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-semibold !text-dash-text">Bill to client</label>
        <button
          type="button"
          onClick={openModal}
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
        <div className="mt-2 p-3 rounded-lg bg-dash-accent/5 border border-dash-accent/10 animate-in fade-in slide-in-from-top-1 duration-300 motion-reduce:animate-none" data-testid="active-client">
          <p className="text-[10px] font-bold text-dash-accent">Active client</p>
          <p className="text-xs font-bold !text-dash-text mt-0.5">{selectedContact.first_name} {selectedContact.last_name}</p>
          {!selectedContact.email && (
            <p className="text-[11px] !text-amber mt-1">No email address — you can save this invoice, but it can't be emailed.</p>
          )}
        </div>
      )}

      {/* Create Client Dialog */}
      <DashModal open={isOpen} onOpenChange={(o) => { if (!o && submittingRef.current) return; setIsOpen(o); }}>
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
                  onChange={(e) => { setEmail(e.target.value); if (formError?.kind === 'duplicate') setFormError(null); }}
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

              {formError?.kind === 'duplicate' && (
                <div role="alert" className="rounded-lg border border-amber/40 bg-amber/10 p-3 text-[12px] !text-dash-text space-y-2" data-testid="duplicate-client">
                  <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber" /> A client with this email already exists.</p>
                  <p className="!text-dash-textMuted">
                    {formError.existing.first_name} {formError.existing.last_name}
                    {formError.existing.email ? ` (${formError.existing.email})` : ''}
                  </p>
                  <DashButton type="button" variant="primary" size="sm" onClick={() => selectExisting(formError.existing)}>
                    Use this client
                  </DashButton>
                </div>
              )}

              {formError?.kind === 'failure' && (
                <div role="alert" className="rounded-lg border border-red/30 bg-red/5 p-3 text-[12px] !text-red flex items-start gap-2" data-testid="create-client-error">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span>{formError.message}</span>
                </div>
              )}
            </div>

            <DashModalFooter>
              <DashButton type="button" variant="secondary" className="flex-1" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
              </DashButton>
              <DashButton type="submit" variant="primary" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : formError?.kind === 'failure' ? (
                  'Retry'
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
