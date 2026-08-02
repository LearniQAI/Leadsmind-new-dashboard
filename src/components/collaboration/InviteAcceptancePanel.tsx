'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, UserCheck, ArrowRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { DashButton } from '@/components/dashboard-ui/Button';
import { InviteStatusCard } from './InviteStatusCard';
import type { UserCollaboration } from '@/types/invitation.types';

interface InviteAcceptancePanelProps {
  invitation: UserCollaboration
  onAccept: (id: string) => Promise<{ success?: boolean; error?: string }>
  onDecline: (id: string) => Promise<{ success?: boolean; error?: string }>
  onComplete?: () => void
}

type FlowState = 'idle' | 'accepting' | 'active' | 'declining' | 'removed' | 'error';

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
      setState('active');
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
      setState('removed');
      toast.success('Invitation declined.');
      setTimeout(() => onComplete?.(), 1500);
    } catch {
      setState('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  if (invitation.status === 'active' || state === 'active') {
    return (
      <div className="bg-success/10 border border-success/20 rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-success/15 mx-auto mb-4 flex items-center justify-center">
          <CheckCircle size={32} className="text-success" />
        </div>
        <h3 className="text-lg font-bold !text-dash-text mb-1">Invitation Accepted</h3>
        <p className="text-sm !text-dash-textMuted">You now have <strong className="!text-dash-text">{invitation.role}</strong> access to <strong className="text-dash-accent">{invitation.formName}</strong>.</p>
      </div>
    );
  }

  if (invitation.status === 'removed' || state === 'removed') {
    return (
      <div className="bg-red/10 border border-red/20 rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-red/15 mx-auto mb-4 flex items-center justify-center">
          <XCircle size={32} className="text-red" />
        </div>
        <h3 className="text-lg font-bold !text-dash-text mb-1">Invitation Removed</h3>
        <p className="text-sm !text-dash-textMuted">You have removed or declined the invitation to <strong className="!text-dash-text">{invitation.formName}</strong>.</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-red/10 border border-red/20 rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-red/15 mx-auto mb-4 flex items-center justify-center">
          <XCircle size={32} className="text-red" />
        </div>
        <h3 className="text-lg font-bold !text-dash-text mb-1">Action Failed</h3>
        <p className="text-sm !text-dash-textMuted">{errorMsg}</p>
        <button
          onClick={() => setState('idle')}
          className="mt-4 px-6 py-2 bg-dash-surface hover:bg-dash-border/60 border border-dash-border rounded-xl text-sm !text-dash-text transition-colors"
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

      <div className="bg-white border border-dash-border rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent">
            <UserCheck size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold !text-dash-text">
              Form Collaboration Invitation
            </h3>
            <p className="text-[10px] !text-dash-textMuted font-medium">
              You've been invited by <strong className="!text-dash-text">{invitation.invitedByEmail}</strong>
            </p>
          </div>
        </div>

        <div className="bg-dash-surface border border-dash-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] !text-dash-textMuted uppercase tracking-wider font-bold mb-1">Form</p>
              <p className="text-sm font-bold !text-dash-text">{invitation.formName}</p>
            </div>
            <ArrowRight size={16} className="!text-dash-textMuted" />
            <div className="text-right">
              <p className="text-[10px] !text-dash-textMuted uppercase tracking-wider font-bold mb-1">Role</p>
              <span className="text-[11px] font-bold uppercase tracking-wider text-dash-accent bg-dash-accent/10 border border-dash-accent/20 px-3 py-1 rounded-lg">
                {invitation.role}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <DashButton
            onClick={handleAccept}
            disabled={state === 'accepting' || state === 'declining'}
            variant="primary"
            className="flex-1 text-[11px] font-bold uppercase tracking-widest"
          >
            {state === 'accepting' ? (
              <><Loader2 size={14} className="animate-spin" /> Accepting...</>
            ) : (
              <><CheckCircle size={14} /> Accept Invitation</>
            )}
          </DashButton>

          <DashButton
            onClick={handleDecline}
            disabled={state === 'accepting' || state === 'declining'}
            variant="secondary"
            className="flex-1 text-[11px] font-bold uppercase tracking-widest hover:!text-red hover:!border-red/40"
          >
            {state === 'declining' ? (
              <><Loader2 size={14} className="animate-spin" /> Declining...</>
            ) : (
              <><XCircle size={14} /> Decline</>
            )}
          </DashButton>
        </div>
      </div>
    </div>
  );
}
