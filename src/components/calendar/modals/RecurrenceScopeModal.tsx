'use client';

// Task 69 — the standard "edit recurring event" scope prompt every calendar app
// shows: This event / This and following events / All events. Shown whenever a
// cancel or reschedule is triggered on an appointment that has a series_id.

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DashButton } from '@/components/dashboard-ui';
import { Loader2 } from 'lucide-react';

export type RecurrenceScope = 'this' | 'following' | 'all';

interface RecurrenceScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'cancel' | 'reschedule';
  /** reschedule is only supported for "this" and "all" in v1 */
  onConfirm: (scope: RecurrenceScope) => Promise<void> | void;
  isLoading?: boolean;
}

export default function RecurrenceScopeModal({
  isOpen,
  onClose,
  action,
  onConfirm,
  isLoading,
}: RecurrenceScopeModalProps) {
  const [scope, setScope] = useState<RecurrenceScope>('this');

  const options: { value: RecurrenceScope; label: string; disabled?: boolean }[] = [
    { value: 'this', label: 'This event only' },
    {
      value: 'following',
      label: 'This and following events',
      disabled: action === 'reschedule',
    },
    { value: 'all', label: 'All events in the series' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] z-[1003] bg-white border-dash-border !text-dash-text">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold !text-dash-text">
            {action === 'cancel' ? 'Cancel recurring meeting' : 'Reschedule recurring meeting'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 rounded-lg border p-3 text-[13px] font-medium transition-colors ${
                opt.disabled
                  ? 'opacity-40 cursor-not-allowed border-dash-border'
                  : scope === opt.value
                    ? 'border-dash-accent bg-dash-accent/5 cursor-pointer'
                    : 'border-dash-border hover:border-dash-accent/40 cursor-pointer'
              }`}
            >
              <input
                type="radio"
                name="recurrence-scope"
                value={opt.value}
                checked={scope === opt.value}
                disabled={opt.disabled}
                onChange={() => setScope(opt.value)}
                className="accent-dash-accent"
              />
              {opt.label}
            </label>
          ))}
          {action === 'reschedule' && (
            <p className="text-[11px] !text-dash-textMuted pt-1">
              "This and following" reschedule isn't available yet — move this occurrence, or the whole series.
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-dash-border pt-4 gap-2 sm:gap-0">
          <DashButton variant="ghost" size="sm" onClick={onClose}>
            Back
          </DashButton>
          <DashButton
            variant={action === 'cancel' ? 'destructive' : 'primary'}
            size="sm"
            onClick={() => onConfirm(scope)}
            disabled={isLoading}
            className="px-6"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            {action === 'cancel' ? 'Cancel meeting(s)' : 'Continue'}
          </DashButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
