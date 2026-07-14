'use client';

import React, { useState } from 'react';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter
} from '@/components/dashboard-ui/Modal';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';
import { Clock, Send, Mail, MessageSquare, Phone } from 'lucide-react';
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
    <DashModal open={open} onOpenChange={onOpenChange}>
      <DashModalContent className="max-w-md">
        <DashModalHeader>
          <div className="w-11 h-11 rounded-xl bg-dash-accent/10 flex items-center justify-center border border-dash-accent/20 mb-2">
            <Clock className="h-5 w-5 text-dash-accent" />
          </div>
          <DashModalTitle>Schedule delivery</DashModalTitle>
          <p className="!text-dash-textMuted text-[13px]">
            Choose when and where to send this document
          </p>
        </DashModalHeader>

        <div className="space-y-6">
          <DashFormField label="Desired delivery time">
            <DashInput
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-12"
            />
          </DashFormField>

          <div className="space-y-3">
            <label className="text-[13px] font-semibold !text-dash-text">
              Multi-channel distribution
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'email', label: 'Official email', icon: Mail, color: 'text-dash-accent' },
                { id: 'sms', label: 'SMS text message', icon: MessageSquare, color: 'text-green' },
                { id: 'whatsapp', label: 'WhatsApp business', icon: Phone, color: 'text-green' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id as any)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all motion-reduce:transition-none text-left",
                    channels.includes(ch.id as any)
                      ? "bg-dash-accent/5 border-dash-accent/30"
                      : "bg-white border-dash-border hover:border-dash-text/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-dash-surface border border-dash-border", ch.color)}>
                      <ch.icon size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold !text-dash-text">{ch.label}</p>
                      <p className="text-[10px] !text-dash-textMuted font-medium">Automatic delivery via secure pipe</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all motion-reduce:transition-none",
                    channels.includes(ch.id as any)
                      ? "bg-dash-accent border-dash-accent"
                      : "border-dash-border"
                  )}>
                    {channels.includes(ch.id as any) && <Send size={10} className="text-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DashModalFooter>
          <DashButton variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </DashButton>
          <DashButton variant="primary" className="flex-1" onClick={handleConfirm}>
            Schedule send <Send size={14} />
          </DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
};

export default SchedulingModal;
