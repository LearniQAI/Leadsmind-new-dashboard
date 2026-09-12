'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DashButton } from '@/components/dashboard-ui';
import { Loader2, Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getRoundRobinPool, setRoundRobinPool } from '@/app/actions/calendar/roundRobin';
import { RoundRobinSettings, type RoundRobinMember } from '@/components/calendar/settings/RoundRobinSettings';

interface RoundRobinPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarId: string | null;
  calendarName: string;
}

export default function RoundRobinPoolModal({ isOpen, onClose, calendarId, calendarName }: RoundRobinPoolModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<RoundRobinMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !calendarId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRoundRobinPool(calendarId).then((res) => {
      if (cancelled) return;
      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setMembers(res.data.members);
      setSelectedIds(res.data.members.filter((m) => m.enrolled).map((m) => m.id));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, calendarId]);

  const handleSave = async () => {
    if (!calendarId) return;
    setSaving(true);
    const res = await setRoundRobinPool(calendarId, selectedIds);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'Failed to save the round-robin team');
      return;
    }
    toast.success(
      selectedIds.length
        ? `${selectedIds.length} host${selectedIds.length === 1 ? '' : 's'} in the rotation`
        : 'Round-robin pool cleared'
    );
    router.refresh();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-white border-dash-border !text-dash-text">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold !text-dash-text flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-dash-accent/10 flex items-center justify-center text-dash-accent">
              <Users size={16} />
            </span>
            Round-robin team
          </DialogTitle>
          <p className="text-[12px] !text-dash-textMuted pt-1">
            Bookings on <span className="font-semibold !text-dash-text">{calendarName}</span> rotate between the enrolled
            hosts — each new booking goes to whoever has the fewest so far.
          </p>
        </DialogHeader>

        <div className="py-2 min-h-[160px]">
          {loading ? (
            <div className="flex items-center justify-center py-12 !text-dash-textMuted">
              <Loader2 className="animate-spin motion-reduce:animate-none" size={20} />
            </div>
          ) : error ? (
            <p className="text-[12px] text-red text-center py-8">{error}</p>
          ) : (
            <RoundRobinSettings members={members} selectedIds={selectedIds} onChange={setSelectedIds} />
          )}
        </div>

        <DialogFooter className="border-t border-dash-border pt-4 gap-2 sm:gap-0">
          <DashButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </DashButton>
          <DashButton
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading || !!error}
            className="px-6"
          >
            {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> : <Check size={14} />}
            Save team
          </DashButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
