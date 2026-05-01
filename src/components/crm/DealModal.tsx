'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Opportunity, Contact } from '@/types/crm.types';
import { createOpportunity, updateOpportunity } from '@/app/actions/pipelines';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, DollarSign, User, Tag as TagIcon } from 'lucide-react';

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageId?: string;
  initialData?: Opportunity;
}

export function DealModal({ isOpen, onClose, stageId, initialData }: DealModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    contact_id: '',
    status: 'open' as 'open' | 'won' | 'lost'
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title,
          value: initialData.value.toString(),
          contact_id: initialData.contact_id || '',
          status: initialData.status
        });
      } else {
        setFormData({
          title: '',
          value: '',
          contact_id: '',
          status: 'open'
        });
      }
      fetchContacts();
    }
  }, [isOpen, initialData]);

  const fetchContacts = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('contacts').select('*').order('first_name');
    if (data) setContacts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error('Title is required');
    
    setIsPending(true);
    try {
      const payload = {
        ...formData,
        value: parseFloat(formData.value) || 0,
        stage_id: stageId
      };

      const res = initialData 
        ? await updateOpportunity(initialData.id, payload)
        : await createOpportunity(payload);

      if (res.success) {
        toast.success(initialData ? 'Deal updated' : 'Deal created');
        onClose();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0b0b10] border-white/5 text-white max-w-lg rounded-[30px] p-8 shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="card__title !text-2xl uppercase tracking-tight italic mb-1">
            {initialData ? 'Edit Deal' : 'New Deal'}
          </DialogTitle>
          <p className="card__sub-title !text-[10px] uppercase tracking-[0.2em]">Capture opportunity details</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="card__sub-title !text-[10px] uppercase tracking-widest !mb-0 px-1">Deal Title</Label>
            <Input
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Enterprise License"
              className="bg-white/[0.03] border-white/10 text-white h-12 rounded-xl focus:ring-primary/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="card__sub-title !text-[10px] uppercase tracking-widest !mb-0 px-1">Deal Value</Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <Input
                  type="number"
                  value={formData.value}
                  onChange={e => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0.00"
                  className="bg-white/[0.03] border-white/10 text-white h-12 pl-11 rounded-xl focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="card__sub-title !text-[10px] uppercase tracking-widest !mb-0 px-1">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v: any) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="bg-white/[0.03] border-white/10 text-white h-12 rounded-xl focus:ring-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/10 text-white">
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="won" className="text-emerald-400">Won</SelectItem>
                  <SelectItem value="lost" className="text-rose-400">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="card__sub-title !text-[10px] uppercase tracking-widest !mb-0 px-1">Associate Contact</Label>
            <Select 
              value={formData.contact_id} 
              onValueChange={v => setFormData({ ...formData, contact_id: v })}
            >
              <SelectTrigger className="bg-white/[0.03] border-white/10 text-white h-12 rounded-xl focus:ring-primary/50">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-white/20" />
                  <SelectValue placeholder="Select a contact..." />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a24] border-white/10 text-white max-h-[200px]">
                {contacts.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="text-white/40 hover:text-white h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="btn btn-primary !h-12 !px-8 !rounded-xl !text-[10px] uppercase font-black tracking-widest flex-1 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (initialData ? 'Update Deal' : 'Create Deal')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
