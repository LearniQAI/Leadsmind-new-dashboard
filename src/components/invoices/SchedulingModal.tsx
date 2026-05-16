'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar, Clock, Send, Mail, MessageSquare, Phone } from 'lucide-react';
import { PremiumInput } from '@/components/ui/premium-inputs';
import { cn } from '@/lib/utils';

interface SchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (config: SchedulingConfig) => void;
}

export interface SchedulingConfig {
  scheduledAt: string;
  channels: ('email' | 'sms' | 'whatsapp')[];
}

const SchedulingModal: React.FC<SchedulingModalProps> = ({
  open,
  onOpenChange,
  onSchedule,
}) => {
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString().slice(0, 16));
  const [channels, setChannels] = useState<('email' | 'sms' | 'whatsapp')[]>(['email']);

  const toggleChannel = (channel: 'email' | 'sms' | 'whatsapp') => {
    if (channels.includes(channel)) {
      if (channels.length > 1) {
        setChannels(channels.filter(c => c !== channel));
      }
    } else {
      setChannels([...channels, channel]);
    }
  };

  const handleConfirm = () => {
    onSchedule({ scheduledAt, channels });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--n800)] border border-[var(--bdrh)] rounded-[var(--r24)] max-w-md p-8 shadow-2xl">
        <DialogHeader className="mb-6">
          <div className="w-12 h-12 rounded-[var(--r12)] bg-[var(--accentg)] flex items-center justify-center border border-[var(--accent)]/20 mb-4">
            <Clock className="h-6 w-6 text-[var(--accent2)]" />
          </div>
          <DialogTitle className="text-xl font-bold font-space text-[var(--t1)] uppercase tracking-tight">
            Schedule <span className="text-[var(--accent2)]">Delivery</span>
          </DialogTitle>
          <p className="text-[var(--t3)] text-xs font-medium uppercase tracking-wider mt-1">
            Choose when and where to send this document
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest flex items-center gap-2">
              <Calendar size={12} className="text-[var(--accent2)]" /> Desired Delivery Time
            </label>
            <PremiumInput
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">
              Multi-Channel Distribution
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'email', label: 'Official Email', icon: Mail, color: 'text-blue-400' },
                { id: 'sms', label: 'SMS Text Message', icon: MessageSquare, color: 'text-emerald-400' },
                { id: 'whatsapp', label: 'WhatsApp Business', icon: Phone, color: 'text-green-500' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id as any)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-[var(--r16)] border transition-all text-left",
                    channels.includes(ch.id as any)
                      ? "bg-[var(--accentg)] border-[var(--accent)]/30"
                      : "bg-[var(--n900)] border-[var(--bdr)] hover:border-[var(--bdrh)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-[var(--r8)] bg-[rgba(255,255,255,0.02)] border border-[var(--bdr)]", ch.color)}>
                      <ch.icon size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--t1)]">{ch.label}</p>
                      <p className="text-[10px] text-[var(--t4)] font-medium">Automatic delivery via secure pipe</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                    channels.includes(ch.id as any)
                      ? "bg-[var(--accent)] border-[var(--accent)]"
                      : "border-[var(--bdr)]"
                  )}>
                    {channels.includes(ch.id as any) && <Send size={10} className="text-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-8 gap-3">
          <button onClick={() => onOpenChange(false)} className="btn-ghost flex-1">
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn-primary flex-1 gap-2">
            Schedule Send <Send size={14} />
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SchedulingModal;
