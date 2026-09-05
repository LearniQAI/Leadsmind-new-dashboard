'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { startEmailConversation } from '@/app/actions/composeEmail';

interface ComposeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the conversation exists — the caller switches to it and
   *  hands off to the existing per-conversation composer for the actual
   *  message (text or voice note), carrying the chosen subject along. */
  onStarted: (result: { conversationId: string; contactId: string; subject: string }) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ComposeEmailModal({ open, onOpenChange, onStarted }: ComposeEmailModalProps) {
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setToEmail('');
    setSubject('');
  };

  const handleSubmit = async () => {
    const trimmedEmail = toEmail.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      toast.error('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    const res = await startEmailConversation({ toEmail: trimmedEmail });
    setSubmitting(false);

    if ('error' in res) {
      toast.error(res.error);
      return;
    }

    onStarted({ conversationId: res.conversationId, contactId: res.contactId, subject: subject.trim() });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) { onOpenChange(next); if (!next) reset(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New email</DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <label className="text-[11.5px] font-semibold text-[#8E8E8E] uppercase tracking-wide">To</label>
            <input
              type="email"
              autoFocus
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="name@example.com"
              className="w-full bg-[#FAFAFA] border border-[#EFEFEF] rounded-xl px-3.5 py-2.5 text-[14px] text-black placeholder:text-[#8E8E8E] focus:outline-none focus:ring-1 focus:ring-black/10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11.5px] font-semibold text-[#8E8E8E] uppercase tracking-wide">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="Leave blank for a default subject"
              className="w-full bg-[#FAFAFA] border border-[#EFEFEF] rounded-xl px-3.5 py-2.5 text-[14px] text-black placeholder:text-[#8E8E8E] focus:outline-none focus:ring-1 focus:ring-black/10"
            />
          </div>

          <p className="text-[12px] text-[#8E8E8E] leading-relaxed">
            You'll write the message — including an optional voice note — in the thread once it's created.
          </p>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !toEmail.trim()}
            className="bg-black hover:bg-black/85 text-white rounded-full px-5"
          >
            {submitting ? 'Starting…' : 'Start conversation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
