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
    bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20'
  },
  accepted: {
    label: 'Accepted', icon: CheckCircle,
    bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20'
  },
  declined: {
    label: 'Declined', icon: XCircle,
    bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20'
  },
  revoked: {
    label: 'Revoked', icon: Ban,
    bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20'
  },
  expired: {
    label: 'Expired', icon: AlertTriangle,
    bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20'
  }
};

export function InviteStatusCard({
  status, role, email, formName, invitedByEmail, createdAt
}: InviteStatusCardProps) {
  const cfg = statusConfig[status];

  return (
    <div className={cn(
      'relative flex items-start gap-4 p-5 rounded-2xl border transition-all',
      'bg-[#0b132c] border-white/5 hover:border-white/10'
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
            'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border',
            cfg.bg, cfg.text, cfg.border
          )}>
            {cfg.label}
          </span>
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
            <Shield size={9} /> {role}
          </span>
        </div>

        {email && (
          <p className="text-sm font-bold text-white truncate">{email}</p>
        )}
        {formName && (
          <p className="text-xs text-t2 mt-0.5">
            Form: <span className="text-t1 font-semibold">{formName}</span>
          </p>
        )}
        {invitedByEmail && (
          <p className="text-[10px] text-t3 mt-0.5">
            Invited by {invitedByEmail}
          </p>
        )}
        {createdAt && (
          <p className="text-[9px] text-t4 mt-1 uppercase tracking-wider">
            {new Date(createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            })}
          </p>
        )}
      </div>
    </div>
  );
}
