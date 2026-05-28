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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
        <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-12 px-6 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2">
          <LifeBuoy size={18} />
          Submit Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0b0b1a] border-white/10 text-white max-w-lg rounded-3xl p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">New Support Ticket</DialogTitle>
          <p className="text-white/40 text-sm font-medium">Describe your issue and the LeadsMind team will get back to you shortly.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Subject</label>
            <Input 
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              placeholder="e.g., Problem with Lead Sync"
              className="bg-white/5 border-white/10 rounded-xl h-12 text-white font-bold placeholder:text-white/20 focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Priority Level</label>
            <Select 
              value={formData.priority} 
              onValueChange={(val) => setFormData({...formData, priority: val})}
            >
              <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-12 text-white font-bold focus:border-primary/50">
                <SelectValue placeholder="Select Priority" />
              </SelectTrigger>
              <SelectContent className="bg-[#0b0b1a] border-white/10 text-white">
                <SelectItem value="low">Low - General Inquiry</SelectItem>
                <SelectItem value="normal">Normal - Functional Issue</SelectItem>
                <SelectItem value="high">High - System Blocker</SelectItem>
                <SelectItem value="urgent">Urgent - Data Security / Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Detailed Message</label>
            <Textarea 
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              placeholder="Provide as much detail as possible..."
              className="bg-white/5 border-white/10 rounded-xl min-h-[150px] text-white font-bold placeholder:text-white/20 focus:border-primary/50"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary-dark text-white font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Submitting...' : (
              <>
                <Send size={18} />
                Send Ticket
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
