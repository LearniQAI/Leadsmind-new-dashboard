'use client';

import { cn } from '@/lib/utils';
import { Clock, CheckCircle, XCircle, Ban, AlertTriangle, Mail, Shield } from 'lucide-react';
import type { InviteStatus } from '@/types/invitation.types';

interface InviteStatusCardProps {
  status: InviteStatus
  role: string
  email?: string
  formName?: string
  invitedByEmail?: string
  createdAt?: string
  expiresAt?: string
}

const statusConfig: Record<InviteStatus, {
  label: string; icon: React.ElementType; bg: string; text: string; border: string
}> = {
  pending: {
    label: 'Pending', icon: Clock,
    bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200'
  },
  active: {
    label: 'Active', icon: CheckCircle,
    bg: 'bg-success/10', text: 'text-success', border: 'border-success/20'
  },
  removed: {
    label: 'Removed', icon: Ban,
    bg: 'bg-red/10', text: 'text-red', border: 'border-red/20'
  }
};

export function InviteStatusCard({
  status, role, email, formName, invitedByEmail, createdAt
}: InviteStatusCardProps) {
  const cfg = statusConfig[status];

  return (
    <div className={cn(
      'relative flex items-start gap-4 p-5 rounded-2xl border transition-all shadow-sm',
      'bg-white border-dash-border hover:border-dash-text/20'
    )}>
      <div className={cn(
        'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border',
        cfg.bg, cfg.border
      )}>
        <cfg.icon size={22} className={cfg.text} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn(
            'text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border',
            cfg.bg, cfg.text, cfg.border
          )}>
            {cfg.label}
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-dash-accent bg-dash-accent/10 border border-dash-accent/20 px-2 py-0.5 rounded-full">
            <Shield size={9} /> {role}
          </span>
        </div>

        {email && (
          <p className="text-sm font-bold !text-dash-text truncate">{email}</p>
        )}
        {formName && (
          <p className="text-xs !text-dash-textMuted mt-0.5">
            Form: <span className="!text-dash-text font-semibold">{formName}</span>
          </p>
        )}
        {invitedByEmail && (
          <p className="text-[10px] !text-dash-textMuted mt-0.5">
            Invited by {invitedByEmail}
          </p>
        )}
        {createdAt && (
          <p className="text-[9px] !text-dash-textMuted mt-1 uppercase tracking-wider">
            {new Date(createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            })}
          </p>
        )}
      </div>
    </div>
  );
}
