"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Lesson-level settings for the Lesson Builder (Systeme-parity Master Prompt, Part 1, Step 3).
// Reuses the exact same unlock_type/drip_value/time_estimate fields and the exact same
// PATCH /api/lms/lessons route already built and live-verified in the Section C pass — this
// is a smaller, builder-embedded surface for those same fields, not a rebuild of them.
interface LessonSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: {
    id: string;
    title: string;
    unlock_type?: string | null;
    drip_value?: number | null;
    time_estimate_minutes?: number | null;
    is_preview?: boolean | null;
  } | null;
  onSaved: (updated: any) => void;
}

export default function LessonSettingsModal({ isOpen, onClose, lesson, onSaved }: LessonSettingsModalProps) {
  const [title, setTitle] = useState('');
  const [unlockType, setUnlockType] = useState('sequential');
  const [dripValue, setDripValue] = useState('');
  const [timeEstimate, setTimeEstimate] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || '');
      setUnlockType(lesson.unlock_type || 'sequential');
      setDripValue(lesson.drip_value != null ? String(lesson.drip_value) : '');
      setTimeEstimate(lesson.time_estimate_minutes != null ? String(lesson.time_estimate_minutes) : '');
      setIsFree(!!lesson.is_preview);
    }
  }, [lesson]);

  const handleSave = async () => {
    if (!lesson) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/lms/lessons?id=${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          unlock_type: unlockType,
          drip_value: dripValue.trim() === '' ? null : parseInt(dripValue, 10),
          time_estimate_minutes: timeEstimate.trim() === '' ? null : parseInt(timeEstimate, 10),
          is_preview: isFree,
        }),
      });
      const dataJson = await res.json();
      if (dataJson.error) {
        toast.error(dataJson.error);
      } else {
        toast.success('Lesson settings saved');
        onSaved(dataJson.data);
        onClose();
      }
    } catch {
      toast.error('Failed to save lesson settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] z-[1200] bg-white border-dash-border !text-dash-text rounded-[16px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-[17px] font-bold">Lesson settings</DialogTitle>
          <DialogDescription className="text-[11px] font-medium !text-dash-textMuted mt-0.5">
            Name, unlock condition, drip delay, and time estimate for this lesson.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Lesson name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 bg-white border-dash-border !text-dash-text rounded-[8px] px-4"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Unlock condition</Label>
            <select
              value={unlockType}
              onChange={(e) => setUnlockType(e.target.value)}
              className="w-full h-11 bg-white border border-dash-border rounded-[8px] px-3 text-[13px] !text-dash-text outline-none focus:border-dash-accent"
            >
              <option value="sequential">Sequential (after the previous lesson)</option>
              <option value="immediate">Immediate (no lock)</option>
              <option value="drip">Drip (days after unlock condition)</option>
              <option value="quiz_gated">Quiz-gated (previous lesson's quiz passed)</option>
            </select>
          </div>

          {unlockType === 'drip' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold !text-dash-textMuted">Drip delay (days)</Label>
              <Input
                type="number"
                min={0}
                value={dripValue}
                onChange={(e) => setDripValue(e.target.value)}
                placeholder="0 = immediately once unlocked"
                className="h-11 bg-white border-dash-border !text-dash-text rounded-[8px] px-4"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Time estimate (minutes)</Label>
            <Input
              type="number"
              min={0}
              value={timeEstimate}
              onChange={(e) => setTimeEstimate(e.target.value)}
              className="h-11 bg-white border-dash-border !text-dash-text rounded-[8px] px-4"
            />
          </div>

          <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4 rounded border-dash-border accent-dash-accent"
            />
            <span className="text-[12px] font-semibold !text-dash-text">Free preview (visible without enrollment)</span>
          </label>
        </div>

        <div className="p-6 bg-dash-surface border-t border-dash-border flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
