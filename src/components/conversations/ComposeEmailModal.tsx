'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, PenLine, Info, Loader2, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
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
  const [emailError, setEmailError] = useState<string | null>(null);

  const reset = () => {
    setToEmail('');
    setSubject('');
    setEmailError(null);
  };

  const handleSubmit = async () => {
    const trimmedEmail = toEmail.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
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
      {/* Explicit opaque bg-white + z-index — the shared DialogContent's default
          `bg-background` resolves to a dark, non-opaque token in this app's theme
          (see globals.css `--background: var(--n900)`), which let the blurred
          backdrop show straight through the panel. Every other real consumer of
          this shared dialog (DealModal, TagsClient, CreateTaskModal, …) already
          overrides it the same way — this modal had simply been missing it. */}
      <DialogContent className="bg-white border border-[#EFEFEF] max-w-[420px] rounded-[28px] p-7 shadow-2xl z-[1001]">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#1359FF]/10 flex items-center justify-center shrink-0">
            <Mail className="w-[19px] h-[19px] text-[#1359FF]" strokeWidth={2.25} />
          </div>
          <div className="pt-0.5 min-w-0">
            <DialogTitle className="text-[17px] font-bold text-black tracking-tight leading-tight">
              New email
            </DialogTitle>
            <p className="text-[12.5px] text-[#8E8E8E] mt-0.5 leading-snug">
              Start a conversation with anyone — no connection needed.
            </p>
          </div>
        </div>

        <div className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#8E8E8E] uppercase tracking-wide pl-0.5">To</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[#8E8E8E]" />
              <input
                type="email"
                autoFocus
                value={toEmail}
                onChange={(e) => { setToEmail(e.target.value); if (emailError) setEmailError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="name@example.com"
                aria-invalid={!!emailError}
                className={cn(
                  "w-full bg-[#FAFAFA] border rounded-2xl pl-10 pr-3.5 py-3 text-[14px] text-black placeholder:text-[#8E8E8E] transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:bg-white",
                  emailError
                    ? "border-red/40 focus:border-red/50 focus:ring-red/10"
                    : "border-[#EFEFEF] focus:border-black/15 focus:ring-black/5"
                )}
              />
            </div>
            {emailError && <p className="text-[11.5px] text-red pl-0.5">{emailError}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#8E8E8E] uppercase tracking-wide pl-0.5">Subject</label>
            <div className="relative">
              <PenLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[#8E8E8E]" />
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Leave blank for a default subject"
                className="w-full bg-[#FAFAFA] border border-[#EFEFEF] rounded-2xl pl-10 pr-3.5 py-3 text-[14px] text-black placeholder:text-[#8E8E8E] transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/15 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-2xl bg-[#FAFAFA] border border-[#EFEFEF] px-3.5 py-3">
            <Info className="w-3.5 h-3.5 text-[#8E8E8E] shrink-0 mt-[1.5px]" />
            <p className="text-[12px] text-[#8E8E8E] leading-relaxed">
              You'll write the message — including an optional voice note — in the thread once it's created.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => { if (!submitting) { onOpenChange(false); reset(); } }}
            disabled={submitting}
            className="h-10 px-4 rounded-full text-[13.5px] font-semibold text-[#8E8E8E] hover:text-black hover:bg-[#FAFAFA] transition-colors motion-reduce:transition-none disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !toEmail.trim()}
            className={cn(
              "h-10 pl-5 pr-4 rounded-full text-[13.5px] font-semibold text-white flex items-center gap-1.5 transition-all motion-reduce:transition-none",
              submitting || !toEmail.trim() ? "bg-black/30 cursor-not-allowed" : "bg-black hover:bg-black/85 active:scale-[0.98] motion-reduce:active:scale-100"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
                Starting…
              </>
            ) : (
              <>
                Start conversation
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
