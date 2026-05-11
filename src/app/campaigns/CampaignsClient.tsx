'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Mail, Calendar, BarChart3, Pencil, Trash2, Send, X,
  CheckCircle, Clock, MoreVertical
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { createEmailCampaign } from '@/app/actions/marketing';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function CampaignsClient({ initialCampaigns }: { initialCampaigns: any[] }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCampaign, setDeleteCampaign] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async () => {
    if (!createName.trim()) { toast.error('Please enter a campaign name'); return; }
    setCreating(true);
    const res = await createEmailCampaign(createName.trim());
    setCreating(false);
    if (res.error) { toast.error(res.error); }
    else {
      toast.success('Campaign created!');
      setCampaigns(prev => [res.data, ...prev]);
      setCreateName(''); setCreateSubject('');
      setCreateOpen(false);
    }
  };

  const openEdit = (campaign: any) => {
    setEditCampaign(campaign);
    setEditName(campaign.name);
    setEditSubject(campaign.subject || '');
    setEditBody(campaign.body || '');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editCampaign) return;
    setSaving(true);
    try {
      const { updateCampaign } = await import('@/app/actions/marketing');
      const res = await updateCampaign(editCampaign.id, { name: editName, subject: editSubject, body: editBody });
      if (res.error) { toast.error(res.error); }
      else {
        toast.success('Campaign updated!');
        setCampaigns(prev => prev.map(c => c.id === editCampaign.id ? { ...c, name: editName, subject: editSubject } : c));
        setEditOpen(false);
      }
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const handlePublish = async (campaign: any) => {
    try {
      const { updateCampaign } = await import('@/app/actions/marketing');
      const isSent = campaign.status === 'sent';
      const newStatus = isSent ? 'draft' : 'sent';
      const res = await updateCampaign(campaign.id, { status: newStatus, sent_at: isSent ? null : new Date().toISOString() });
      if (res.error) { toast.error(res.error); return; }
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
      toast.success(isSent ? 'Campaign moved to Draft' : 'Campaign marked as Sent!');
    } catch { toast.error('Status update failed'); }
  };

  const openDelete = (campaign: any) => { setDeleteCampaign(campaign); setDeleteOpen(true); };

  const handleDelete = async () => {
    if (!deleteCampaign) return;
    setDeleting(true);
    try {
      const { deleteCampaignAction } = await import('@/app/actions/marketing');
      const res = await deleteCampaignAction(deleteCampaign.id);
      if (res.error) { toast.error(res.error); }
      else {
        toast.success('Campaign deleted');
        setCampaigns(prev => prev.filter(c => c.id !== deleteCampaign.id));
        setDeleteOpen(false);
      }
    } catch { toast.error('Delete failed'); }
    setDeleting(false);
  };

  const statusColor = (status: string) => {
    if (status === 'sent') return 'bg-emerald-100 text-emerald-700';
    if (status === 'scheduled') return 'bg-blue-100 text-blue-700';
    return 'bg-amber-100 text-amber-700';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="card__title !text-4xl uppercase mb-1">Email <span className="text-primary">Campaigns</span></h1>
          <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Broadcast your message with precision delivery.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-8 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {campaigns.length === 0 ? (
          <div className="col-span-full py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/40 transition-all" onClick={() => setCreateOpen(true)}>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
              <Send className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-black uppercase text-gray-500 tracking-widest">No Campaigns Yet</h3>
            <p className="text-gray-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Click to create your first campaign</p>
          </div>
        ) : campaigns.map(campaign => (
          <div key={campaign.id} className="card__wrapper !p-6 !mb-0 group hover:border-primary/50 transition-all duration-300 shadow-lg">
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Mail size={20} />
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border-none ${statusColor(campaign.status)}`}>
                  {campaign.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                      <MoreVertical size={14} className="text-gray-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl min-w-[160px]">
                    <DropdownMenuItem onClick={() => openEdit(campaign)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg mx-1 px-3 py-2">
                      <Pencil size={14} /> Edit Campaign
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePublish(campaign)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg mx-1 px-3 py-2">
                      {campaign.status === 'sent' ? <><Clock size={14} /> Move to Draft</> : <><Send size={14} /> Mark as Sent</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDelete(campaign)} className="flex items-center gap-2 cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg mx-1 px-3 py-2">
                      <Trash2 size={14} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-1">{campaign.name}</h4>
              <p className="text-gray-400 text-[10px] font-bold tracking-widest uppercase">Subject: <span className="text-gray-600">{campaign.subject || '—'}</span></p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[['Opens', campaign.open_rate ? `${campaign.open_rate}%` : '—'], ['Clicks', campaign.click_rate ? `${campaign.click_rate}%` : '—'], ['Bounced', '0%']].map(([label, val]) => (
                <div key={label} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</span>
                  <span className="text-sm font-black text-gray-700">{val}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                <Calendar className="w-3.5 h-3.5" />
                {campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString() : 'Not sent'}
              </div>
              <Button onClick={() => openEdit(campaign)} variant="outline" className="h-9 px-4 rounded-xl border-gray-200 text-[9px] font-black uppercase text-gray-600 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-2">
                <Pencil size={12} /> Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-md p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">New <span className="text-primary">Campaign</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Campaign Name</Label>
              <Input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Welcome Sequence" className="h-12 border-gray-200 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Email Subject</Label>
              <Input value={createSubject} onChange={e => setCreateSubject(e.target.value)} placeholder="e.g. Welcome to LeadsMind!" className="h-12 border-gray-200 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="btn-primary rounded-xl font-black uppercase text-xs px-8">{creating ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-lg p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">Edit <span className="text-primary">Campaign</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 border-gray-200 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Subject</Label>
              <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} className="h-12 border-gray-200 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Email Body</Label>
              <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} placeholder="Write your email content..." className="min-h-[150px] border-gray-200 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="btn-primary rounded-xl font-black uppercase text-xs px-8">{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-sm p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">Delete Campaign?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500 text-sm py-4">This will permanently delete <strong className="text-gray-800">{deleteCampaign?.name}</strong>. This cannot be undone.</p>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8">{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
