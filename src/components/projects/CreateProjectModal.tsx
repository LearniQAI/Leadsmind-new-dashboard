'use client';

import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DashButton } from '@/components/dashboard-ui/Button';
import { createClient } from '@/lib/supabase/client';
import { createProject } from '@/app/actions/operations';

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Replaces the old window.prompt()-based project creation flow. Contact picker mirrors
 * DealModal.tsx's pattern (shadcn Select fed by a local fetchContacts() call on open) rather
 * than inventing a new component, since Pipelines' deal-creation modal is the closest existing
 * "create X with an associated contact" surface in this codebase.
 */
export function CreateProjectModal({ isOpen, onClose, onCreated }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [contactId, setContactId] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setContactId('');
    const supabase = createClient();
    supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .order('first_name')
      .then(({ data }) => setContacts(data || []));
  }, [isOpen]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Project name is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await createProject(name.trim(), contactId || null);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Project created');
        onCreated();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] z-[1002] bg-white border-dash-border !text-dash-text">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-[11px] font-semibold !text-dash-textMuted">Project Name</Label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Website Redesign"
              className="mt-1 w-full h-10 px-3 rounded-lg border border-dash-border bg-white text-sm !text-dash-text"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-semibold !text-dash-textMuted">Associate Contact (optional)</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="h-10">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-dash-textMuted" />
                  <SelectValue placeholder="Select a contact..." />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] !text-dash-textMuted">Required for "Project started" automations to fire, and for the client portal timeline.</p>
          </div>

          <DashButton onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? 'Creating...' : 'Create Project'}
          </DashButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
