'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, UserCheck, ArrowRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InviteStatusCard } from './InviteStatusCard';
import type { UserCollaboration } from '@/types/invitation.types';

interface InviteAcceptancePanelProps {
  invitation: UserCollaboration
  onAccept: (id: string) => Promise<{ success?: boolean; error?: string }>
  onDecline: (id: string) => Promise<{ success?: boolean; error?: string }>
  onComplete?: () => void
}

type FlowState = 'idle' | 'accepting' | 'accepted' | 'declining' | 'declined' | 'error';

export function InviteAcceptancePanel({
  invitation, onAccept, onDecline, onComplete
}: InviteAcceptancePanelProps) {
  const [state, setState] = useState<FlowState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAccept = async () => {
    setState('accepting');
    setErrorMsg('');
    try {
      const res = await onAccept(invitation.id);
      if (res.error) {
        setState('error');
        setErrorMsg(res.error);
        toast.error(res.error);
        return;
      }
      setState('accepted');
      toast.success('Invitation accepted! You now have access to this form.');
      setTimeout(() => onComplete?.(), 1500);
    } catch {
      setState('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  const handleDecline = async () => {
    setState('declining');
    setErrorMsg('');
    try {
      const res = await onDecline(invitation.id);
      if (res.error) {
        setState('error');
        setErrorMsg(res.error);
        toast.error(res.error);
        return;
      }
      setState('declined');
      toast.success('Invitation declined.');
      setTimeout(() => onComplete?.(), 1500);
    } catch {
      setState('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  if (invitation.status === 'accepted' || state === 'accepted') {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 mx-auto mb-4 flex items-center justify-center">
          <CheckCircle size={32} className="text-emerald-400" />
        </div>
        <h3 className="text-lg font-space-grotesk font-bold text-white mb-1">Invitation Accepted</h3>
        <p className="text-sm text-t2">You now have <strong className="text-t1">{invitation.role}</strong> access to <strong className="text-blue-400">{invitation.formName}</strong>.</p>
      </div>
    );
  }

  if (invitation.status === 'declined' || state === 'declined') {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 mx-auto mb-4 flex items-center justify-center">
          <XCircle size={32} className="text-rose-400" />
        </div>
        <h3 className="text-lg font-space-grotesk font-bold text-white mb-1">Invitation Declined</h3>
        <p className="text-sm text-t2">You have declined the invitation to <strong className="text-t1">{invitation.formName}</strong>.</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 mx-auto mb-4 flex items-center justify-center">
          <XCircle size={32} className="text-rose-400" />
        </div>
        <h3 className="text-lg font-space-grotesk font-bold text-white mb-1">Action Failed</h3>
        <p className="text-sm text-t2">{errorMsg}</p>
        <button
          onClick={() => setState('idle')}
          className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-t1 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <InviteStatusCard
        status={invitation.status as any}
        role={invitation.role}
        email={invitation.invitedByEmail}
        formName={invitation.formName}
        createdAt={invitation.createdAt}
      />

      <div className="bg-[#0b132c] border border-white/5 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <UserCheck size={22} />
          </div>
          <div>
            <h3 className="text-sm font-space-grotesk font-bold text-white">
              Form Collaboration Invitation
            </h3>
            <p className="text-[10px] text-t3 font-medium">
              You've been invited by <strong className="text-t1">{invitation.invitedByEmail}</strong>
            </p>
          </div>
        </div>

        <div className="bg-[#04091a] border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-t3 uppercase tracking-wider font-bold mb-1">Form</p>
              <p className="text-sm font-bold text-white">{invitation.formName}</p>
            </div>
            <ArrowRight size={16} className="text-t4" />
            <div className="text-right">
              <p className="text-[10px] text-t3 uppercase tracking-wider font-bold mb-1">Role</p>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">
                {invitation.role}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            disabled={state === 'accepting' || state === 'declining'}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all',
              'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {state === 'accepting' ? (
              <><Loader2 size={14} className="animate-spin" /> Accepting...</>
            ) : (
              <><CheckCircle size={14} /> Accept Invitation</>
            )}
          </button>

          <button
            onClick={handleDecline}
            disabled={state === 'accepting' || state === 'declining'}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all',
              'bg-white/5 hover:bg-rose-500/10 text-t2 hover:text-rose-400 border border-white/10 hover:border-rose-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {state === 'declining' ? (
              <><Loader2 size={14} className="animate-spin" /> Declining...</>
            ) : (
              <><XCircle size={14} /> Decline</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
