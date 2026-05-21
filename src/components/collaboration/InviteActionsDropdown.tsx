'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Send, XCircle, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InviteActionsDropdownProps {
  collabId: string
  formId: string
  status: string
  email?: string
  onResend?: (collabId: string, formId: string) => Promise<{ success?: boolean; error?: string }>
  onRevoke?: (collabId: string, formId: string) => Promise<{ success?: boolean; error?: string }>
  onRemove?: (collabId: string, formId: string) => Promise<{ success?: boolean; error?: string }>
}

export function InviteActionsDropdown({
  collabId, formId, status, email, onResend, onRevoke, onRemove
}: InviteActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAction = async (
    label: string,
    fn?: (collabId: string, formId: string) => Promise<{ success?: boolean; error?: string }>
  ) => {
    if (!fn) return;
    setAction(label);
    try {
      const res = await fn(collabId, formId);
      if (res.error) { toast.error(res.error); return; }
      toast.success(`${label} successful`);
      setOpen(false);
    } catch {
      toast.error(`${label} failed`);
    } finally {
      setAction(null);
    }
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/forms/${formId}/governance?accept=${formId}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied');
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-t4 hover:text-t1 hover:bg-white/5 transition-colors"
        aria-label="Invite actions"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-[#080f28] border border-white/10 rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5">
            {status === 'pending' && (
              <button
                onClick={() => handleAction('Resend', onResend)}
                disabled={action !== null}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[11px] font-bold text-t2 hover:text-t1 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {action === 'Resend' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Resend Invitation
              </button>
            )}

            <button
              onClick={copyInviteLink}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[11px] font-bold text-t2 hover:text-t1 hover:bg-white/5 transition-colors"
            >
              <Copy size={14} /> Copy Invite Link
            </button>

            <button
              onClick={() => window.open(`/forms/${formId}/governance`, '_blank')}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[11px] font-bold text-t2 hover:text-t1 hover:bg-white/5 transition-colors"
            >
              <ExternalLink size={14} /> Open Form
            </button>

            {(status === 'pending' || status === 'active') && (
              <>
                <div className="border-t border-white/5 my-1" />
                {status === 'pending' && (
                  <button
                    onClick={() => handleAction('Revoke', onRevoke)}
                    disabled={action !== null}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                  >
                    {action === 'Revoke' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Revoke Invitation
                  </button>
                )}
                <button
                  onClick={() => handleAction('Remove', onRemove)}
                  disabled={action !== null}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[11px] font-bold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  {action === 'Remove' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Remove Access
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
