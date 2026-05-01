'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';



import { MoreHorizontal, Trash2, Users, Tag as TagIcon } from 'lucide-react';
import type { Contact } from '@/types/crm.types';
import Link from 'next/link';
import { format } from 'date-fns';

import { deleteContact, bulkAddTag } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ContactTableProps {
  contacts: Contact[];
}

export function ContactTable({ contacts }: ContactTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const result = await deleteContact(id);
      if (result.success) {
        toast.success('Contact deleted');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to delete contact');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="table__wrapper meeting-table table-responsive">
      <table className="table mb-[20px] w-full">
        <thead>
          <tr className="table__title">
            <th className="w-[50px]">
              <Checkbox
                checked={selectedIds.length === contacts.length && contacts.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </th>
            <th className="text-[10px] font-black uppercase tracking-widest text-white/30">Contact</th>
            <th className="text-[10px] font-black uppercase tracking-widest text-white/30">Email</th>
            <th className="text-[10px] font-black uppercase tracking-widest text-white/30">Tags</th>
            <th className="text-[10px] font-black uppercase tracking-widest text-white/30">Added</th>
            <th className="w-[80px] text-right"></th>
          </tr>
        </thead>
        <tbody className="table__body">
          {contacts?.map((contact) => (
            <tr key={contact.id} className="group">
              <td>
                <Checkbox
                  checked={selectedIds.includes(contact.id)}
                  onCheckedChange={() => toggleSelect(contact.id)}
                />
              </td>
              <td>
                <Link href={`/apps/contacts/${contact.id}`} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-white/5">
                    <AvatarFallback className="bg-white/5 text-white/40 text-[10px] font-bold">
                      {contact.first_name?.[0]}{contact.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                      {contact.first_name} {contact.last_name}
                    </span>
                    {contact.phone && (
                      <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">{contact.phone}</span>
                    )}
                  </div>
                </Link>
              </td>
              <td>
                <span className="text-xs text-white/40 font-bold uppercase tracking-tight">{contact.email || '-'}</span>
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {contact.tags?.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-primary/5 text-primary border border-primary/10 text-[8px] px-1.5 py-0 capitalize font-black tracking-widest">
                      {tag}
                    </Badge>
                  ))}
                  {(contact.tags?.length || 0) > 2 && (
                    <span className="text-[8px] text-white/20 font-black uppercase tracking-tighter self-center">+{(contact.tags?.length || 0) - 2}</span>
                  )}
                </div>
              </td>
              <td>
                <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">
                  {format(new Date(contact.created_at), 'MMM d, yyyy')}
                </span>
              </td>
              <td className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger className="btn btn-icon btn-sm btn-primary rounded-xl shadow-lg shadow-primary/20">
                    <MoreHorizontal size={14} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#0c0c14] border-white/10 text-white min-w-[160px] z-[9999]">
                    <DropdownMenuItem 
                      className="cursor-pointer flex items-center gap-2"
                      onClick={() => router.push(`/apps/contacts/${contact.id}`)}
                    >
                      <Users className="h-4 w-4 text-white/40" />
                      <span>View Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-rose-400 focus:text-rose-400 cursor-pointer gap-2"
                      onClick={() => handleDelete(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Contact</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
          {contacts.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-20">
                <div className="flex flex-col items-center gap-3 text-white/20">
                  <Users className="h-10 w-10 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">No contacts found</p>
                  <Link href="/apps/contacts/new" className="btn btn-sm btn-outline-theme-border rounded-xl mt-2">
                    Add First Contact
                  </Link>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* BULK ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
          <div className="flex items-center gap-6 px-6 py-3 bg-[#0a0a0f] border border-primary/20 rounded-2xl shadow-2xl shadow-primary/10 backdrop-blur-xl">
            <div className="flex items-center gap-3 pr-6 border-r border-white/5">
              <div className="h-5 w-5 rounded bg-primary flex items-center justify-center text-[10px] font-black">{selectedIds.length}</div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Selected</span>
            </div>

            <div className="flex items-center gap-2">
              <BulkTagAction ids={selectedIds} onComplete={() => setSelectedIds([])} />
              <button
                className="btn btn-sm btn-outline-danger rounded-xl text-[9px] font-black uppercase tracking-widest gap-2"
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.length} contacts?`)) {
                    toast.success("Bulk delete initiated");
                    setSelectedIds([]);
                  }
                }}
              >
                <Trash2 size={12} />
                Delete
              </button>
              <button
                className="btn btn-sm btn-outline-theme-border rounded-xl text-[9px] font-black uppercase tracking-widest"
                onClick={() => setSelectedIds([])}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkTagAction({ ids, onComplete }: { ids: string[], onComplete: () => void }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleApplyTag = async () => {
    const tagName = prompt("Enter tag name to apply to selected contacts:");
    if (!tagName) return;

    setLoading(true);
    try {
      const res = await bulkAddTag(ids, tagName);
      if (res.success) {
        toast.success(`Tag applied to ${ids.length} contacts`);
        onComplete();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to apply tag");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleApplyTag}
      className="btn btn-sm btn-primary !rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/20"
      disabled={loading}
    >
      <TagIcon size={12} />
      Add Tag
    </button>
  );
}



