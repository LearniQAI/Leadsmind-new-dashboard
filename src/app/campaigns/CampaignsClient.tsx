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
  const [editTags, setEditTags] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCampaign, setDeleteCampaign] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const prefillSubject = searchParams.get('prefill_subject');
      const prefillBody = searchParams.get('prefill_body');
      const prefillName = searchParams.get('prefill_name');
      
      if (prefillSubject || prefillBody || prefillName) {
        setCreateName(prefillName || 'New Campaign from Content Studio');
        setCreateSubject(prefillSubject || '');
        setCreateOpen(true);
      }
    }
  }, []);

  const handleCreate = async () => {
    if (!createName.trim()) { toast.error('Please enter a campaign name'); return; }
    setCreating(true);
    const res = await createEmailCampaign(createName.trim());
    setCreating(false);
    if (res.error) { toast.error(res.error); }
    else {
      toast.success('Campaign created!');
      
      let newCampaign = res.data;
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const prefillBody = searchParams.get('prefill_body');
        const prefillSubject = searchParams.get('prefill_subject');
        
        if (prefillBody || prefillSubject || createSubject) {
          try {
            const { updateCampaign } = await import('@/app/actions/marketing');
            const updateRes = await updateCampaign(newCampaign.id, {
              subject: prefillSubject || createSubject || newCampaign.subject,
              body_plain: prefillBody || '',
              body_html: prefillBody || ''
            });
            if (!updateRes.error && updateRes.data) {
              newCampaign = updateRes.data;
            }
          } catch (e) {
            console.error('Failed to prefill campaign details', e);
          }
        }
      }

      setCampaigns(prev => [newCampaign, ...prev]);
      setCreateName(''); setCreateSubject('');
      setCreateOpen(false);
      router.replace('/campaigns');
    }
  };

  const openEdit = (campaign: any) => {
    setEditCampaign(campaign);
    setEditName(campaign.name);
    setEditSubject(campaign.subject || '');
    setEditBody(campaign.preview_text || '');
    
    // Extract tags from segment JSONB if available
    let tags = '';
    try {
      if (campaign.segment && typeof campaign.segment === 'object') {
        if (Array.isArray(campaign.segment.tags)) {
          tags = campaign.segment.tags.join(', ');
        }
      }
    } catch (e) {}
    setEditTags(tags);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editCampaign) return;
    setSaving(true);
    try {
      const { updateCampaign } = await import('@/app/actions/marketing');
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      const segmentData = tagsArray.length > 0 ? { tags: tagsArray } : null;
      
      const res = await updateCampaign(editCampaign.id, { 
        name: editName, 
        subject: editSubject, 
        preview_text: editBody, 
        body_html: editBody,
        segment: segmentData
      });
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
          <div className="col-span-full py-20 bg-[#080f28]/45 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#3b82f6]/40 hover:bg-[#080f28]/60 transition-all" onClick={() => setCreateOpen(true)}>
            <div className="w-16 h-16 bg-[#3b82f6]/10 rounded-full flex items-center justify-center mb-6 border border-[#3b82f6]/20">
              <Send className="w-8 h-8 text-[#3b82f6]" />
            </div>
            <h3 className="text-lg font-black uppercase text-[#94a3c8] tracking-widest">No Campaigns Yet</h3>
            <p className="text-[#4a5a82] text-[10px] font-bold mt-2 uppercase tracking-widest">Click to create your first campaign</p>
          </div>
        ) : campaigns.map(campaign => (
          <div key={campaign.id} className="card__wrapper !bg-[#080f28] !border-white/5 !p-6 !mb-0 group hover:border-[#3b82f6]/50 transition-all duration-300 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-[#3b82f6]/20">
                <Mail size={20} />
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border-none ${statusColor(campaign.status)}`}>
                  {campaign.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                      <MoreVertical size={14} className="text-[#94a3c8]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#04091a] border border-white/5 shadow-2xl rounded-xl min-w-[160px] text-[#94a3c8]">
                    <DropdownMenuItem onClick={() => router.push(`/campaigns/${campaign.id}/builder`)} className="flex items-center gap-2 cursor-pointer hover:text-white hover:bg-[#3b82f6]/10 rounded-lg mx-1 px-3 py-2">
                      <Pencil size={14} /> Design Layout
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(campaign)} className="flex items-center gap-2 cursor-pointer hover:text-white hover:bg-[#3b82f6]/10 rounded-lg mx-1 px-3 py-2">
                      <Pencil size={14} /> Edit Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePublish(campaign)} className="flex items-center gap-2 cursor-pointer hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg mx-1 px-3 py-2">
                      {campaign.status === 'sent' ? <><Clock size={14} /> Move to Draft</> : <><Send size={14} /> Mark as Sent</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDelete(campaign)} className="flex items-center gap-2 cursor-pointer text-rose-500 hover:bg-rose-500/10 rounded-lg mx-1 px-3 py-2">
                      <Trash2 size={14} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-1">{campaign.name}</h4>
              <p className="text-[#4a5a82] text-[10px] font-bold tracking-widest uppercase">Subject: <span className="text-[#94a3c8]">{campaign.subject || '—'}</span></p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[['Opens', campaign.open_rate ? `${campaign.open_rate}%` : '—'], ['Clicks', campaign.click_rate ? `${campaign.click_rate}%` : '—'], ['Bounced', '0%']].map(([label, val]) => (
                <div key={label} className="p-3 bg-[#04091a] rounded-xl border border-white/5 text-center shadow-sm">
                  <span className="block text-[9px] font-black text-[#4a5a82] uppercase tracking-widest mb-1">{label}</span>
                  <span className="text-base font-black text-white">{val}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-white/5">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#4a5a82] uppercase">
                <Calendar className="w-3.5 h-3.5" />
                {campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString() : 'Not sent'}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => openEdit(campaign)} variant="outline" className="h-9 px-3 rounded-xl border-white/5 text-[9px] font-black uppercase text-[#94a3c8] hover:text-white hover:border-white/20 hover:bg-white/5 transition-all">
                  Settings
                </Button>
                <Button onClick={() => router.push(`/campaigns/${campaign.id}/builder`)} className="btn-primary h-9 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md shadow-primary/10">
                  Design
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#080f28] border border-white/5 rounded-3xl max-w-md p-8 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">New <span className="text-primary">Campaign</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Campaign Name</Label>
              <Input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Welcome Sequence" className="h-12 border-white/5 rounded-xl text-white bg-[#04091a] placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-[#3b82f6]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Email Subject</Label>
              <Input value={createSubject} onChange={e => setCreateSubject(e.target.value)} placeholder="e.g. Welcome to LeadsMind!" className="h-12 border-white/5 rounded-xl text-white bg-[#04091a] placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-[#3b82f6]" />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-white/5 text-[#94a3c8] hover:text-white bg-transparent rounded-xl text-xs font-bold uppercase tracking-wider">Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="btn-primary rounded-xl font-black uppercase text-xs px-8 shadow-lg shadow-primary/20">{creating ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#080f28] border border-white/5 rounded-3xl max-w-lg p-8 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Edit <span className="text-primary">Campaign</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 border-white/5 rounded-xl text-white bg-[#04091a] placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-[#3b82f6]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Subject</Label>
              <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} className="h-12 border-white/5 rounded-xl text-white bg-[#04091a] placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-[#3b82f6]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Target Audience Tags (Comma Separated)</Label>
              <Input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="e.g. VIP, Newsletter, Leads" className="h-12 border-white/5 rounded-xl text-white bg-[#04091a] placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-[#3b82f6]" />
              <p className="text-[9px] text-[#4a5a82] font-medium">Leave blank to send to all contacts.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Email Body / plain text preview</Label>
              <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} placeholder="Write your email content..." className="min-h-[150px] border-white/5 rounded-xl text-white bg-[#04091a] placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-[#3b82f6]" />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-white/5 text-[#94a3c8] hover:text-white bg-transparent rounded-xl text-xs font-bold uppercase tracking-wider">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="btn-primary rounded-xl font-black uppercase text-xs px-8 shadow-lg shadow-primary/20">{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#080f28] border border-white/5 rounded-3xl max-w-sm p-8 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">Delete Campaign?</DialogTitle>
          </DialogHeader>
          <p className="text-[#94a3c8] text-sm py-4">This will permanently delete <strong className="text-white">{deleteCampaign?.name}</strong>. This cannot be undone.</p>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-white/5 text-[#94a3c8] hover:text-white bg-transparent rounded-xl text-xs font-bold uppercase tracking-wider">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8 shadow-lg shadow-rose-600/20">{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
