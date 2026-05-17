'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Contact } from '@/types/crm';
import { ContactTable } from '@/components/crm/ContactTable';
import { ContactFilters } from '@/components/crm/ContactFilters';
import { BulkActionToolbar } from '@/components/crm/BulkActionToolbar';
import { EmptyState } from '@/components/common/EmptyState';
import { bulkAddTag, deleteContact } from '../actions/contacts';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TagDialog } from '@/components/crm/TagDialog';
import { ManageTagsDialog } from '@/components/crm/ManageTagsDialog';
import { ImportContactsModal } from '@/components/crm/ImportContactsModal';

interface ContactsClientProps {
  initialContacts: Contact[];
  initialTags: { id: string; name: string; count: number }[];
}

export default function ContactsClient({ initialContacts, initialTags }: ContactsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Derived state
  const allTags = useMemo(() => {
    if (initialTags && initialTags.length > 0) {
      return initialTags.map(t => t.name);
    }
    const tags = new Set<string>();
    initialContacts.forEach(c => c.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [initialContacts, initialTags]);

  const filteredContacts = useMemo(() => {
    return initialContacts.filter(c => {
      // 1. Search Query
      const searchStr = `${c.first_name} ${c.last_name} ${c.email} ${c.tags?.join(' ')}`.toLowerCase();
      const matchesSearch = !searchQuery || searchStr.includes(searchQuery.toLowerCase());

      // 2. Tactical Sidebar Tags
      const matchesTags = selectedTags.length === 0 ||
        selectedTags.every(tag => c.tags?.includes(tag));

      // 3. Owner Filter
      const matchesOwner = !selectedOwner || c.owner_id === selectedOwner;

      return matchesSearch && matchesTags && matchesOwner;
    });
  }, [initialContacts, searchQuery, selectedTags, selectedOwner]);

  // Handlers
  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    else setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;

    for (const id of ids) {
      const res = await deleteContact(id);
      if (res.success) successCount++;
    }

    toast.success(`Successfully deleted ${successCount} leads`);
    setSelectedIds(new Set());
    setIsDeleting(false);
  };

  const handleBulkAddTag = async (tag: string) => {
    const res = await bulkAddTag(Array.from(selectedIds), tag);
    if (res.success) {
      toast.success(`Added tag "${tag}" to ${selectedIds.size} leads`);
      setSelectedIds(new Set());
    } else {
      toast.error(res.error || 'Failed to add tags');
    }
  };

  if (initialContacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <EmptyState
          icon="fa-users"
          title="No contacts added"
          description="Your database is currently empty. Start by importing leads or adding them manually to activate the command center."
          action={{
            label: "Import Contacts",
            onClick: () => setIsImportModalOpen(true)
          }}
        />
        <ImportContactsModal
          isOpen={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          trigger={<span className="hidden" />}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-160px)] bg-[#04091a] relative overflow-hidden">
      {/* 1. Left Sidebar: Filters */}
      <ContactFilters
        tags={allTags}
        selectedTags={selectedTags}
        onTagToggle={(tag) => {
          setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
          );
        }}
        owners={[]} // Would fetch from workspace members
        selectedOwner={selectedOwner}
        onOwnerChange={setSelectedOwner}
        onManageTags={() => setIsManageTagsOpen(true)}
      />

      {/* 2. Main Content: Table */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#04091a]">
        {/* Table Toolbar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#080f28]/40 shrink-0">
          <div className="flex-1 max-w-md relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#4a5a82]"></i>
            <input
              type="text"
              placeholder="Search leads by name, email, or tactical data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-[13px] text-[#eef2ff] placeholder:text-[#4a5a82] pl-9 focus:outline-none focus:ring-0 font-dm-sans"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] font-bold text-[#4a5a82] uppercase tracking-widest font-dm-sans">
              Displaying {filteredContacts.length} Leads
            </span>
            <button 
              className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors disabled:opacity-50" 
              onClick={handleRefresh}
              disabled={isPending}
            >
              <i className={`fa-solid fa-arrows-rotate text-[13px] ${isPending ? 'animate-spin text-[#3b82f6]' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* The Table */}
        <div className="flex-1 overflow-y-auto common-scrollbar">
          <ContactTable
            contacts={filteredContacts}
            onSelectContact={(id) => console.log('Select', id)}
            selectedIds={selectedIds}
            onToggleOne={toggleOne}
            onToggleAll={toggleAll}
            isLoading={isPending}
          />
        </div>
      </div>

      {/* 3. Bulk Action Toolbar (Floating) */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setIsConfirmOpen(true)}
        onAddTag={() => setIsTagDialogOpen(true)}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title="Purge Relationship Data?"
        description={`You are about to permanently delete ${selectedIds.size} selected leads. This tactical operation cannot be reversed and all historical engagement data will be lost.`}
        confirmLabel="Purge Leads"
        variant="danger"
      />

      <TagDialog
        isOpen={isTagDialogOpen}
        onClose={() => setIsTagDialogOpen(false)}
        onConfirm={handleBulkAddTag}
        selectedCount={selectedIds.size}
      />
      <ManageTagsDialog
        isOpen={isManageTagsOpen}
        onClose={() => setIsManageTagsOpen(false)}
        tags={initialTags && initialTags.length > 0 ? initialTags : allTags.map(tag => ({
          id: tag,
          name: tag,
          count: initialContacts.filter(c => c.tags?.includes(tag)).length
        }))}
      />
    </div>
  );
}
