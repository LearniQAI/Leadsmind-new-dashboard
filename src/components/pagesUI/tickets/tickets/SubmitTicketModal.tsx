// @ts-nocheck
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { DashButton } from "@/components/dashboard-ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { createSupportTicket } from '@/app/actions/operations';
import { LifeBuoy, Send } from 'lucide-react';

const PRIORITIES = [
  { value: 'low', label: 'Low - General Inquiry' },
  { value: 'normal', label: 'Normal - Functional Issue' },
  { value: 'high', label: 'High - System Blocker' },
  { value: 'urgent', label: 'Urgent - Data Security / Loss' },
];

export default function SubmitTicketModal() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createSupportTicket(formData);
      if (res.error) throw new Error(res.error);

      toast.success('Ticket submitted successfully to LeadsMind');
      setOpen(false);
      setFormData({ subject: '', message: '', priority: 'normal' });
      // Optionally refresh the tickets list
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DashButton variant="primary" className="gap-2">
          <LifeBuoy size={18} />
          Submit Ticket
        </DashButton>
      </DialogTrigger>
      <DialogContent className="bg-white border border-dash-border !text-dash-text max-w-lg rounded-2xl p-8 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight !text-dash-text">
            New Support <span className="text-dash-accent">Ticket</span>
          </DialogTitle>
          <p className="!text-dash-textMuted text-sm">Describe your issue and the LeadsMind team will get back to you shortly.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-[12px] font-semibold !text-dash-textMuted">Subject</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              placeholder="e.g., Problem with Lead Sync"
              className="h-12 border-dash-border rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[12px] font-semibold !text-dash-textMuted">Priority Level</Label>
            <Select
              value={formData.priority}
              onValueChange={(v) => setFormData({...formData, priority: v})}
            >
              <SelectTrigger className="h-12 border-dash-border rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-dash-border rounded-xl shadow-lg">
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[12px] font-semibold !text-dash-textMuted">Detailed Message</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              placeholder="Provide as much detail as possible..."
              className="min-h-[150px] border-dash-border rounded-xl"
            />
          </div>
          <DashButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            className="w-full mt-2"
          >
            {isSubmitting ? 'Submitting...' : (
              <>
                <Send size={18} />
                Send Ticket
              </>
            )}
          </DashButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
