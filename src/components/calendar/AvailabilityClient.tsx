'use client';

import React, { useState } from 'react';
import { DashButton } from '@/components/dashboard-ui';
import { Input } from '@/components/ui/input';
import { Loader2, Check, Plus, Trash2, CalendarOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  saveWeeklyAvailability,
  saveDateOverride,
  deleteDateOverride,
  getAvailabilitySettings,
  type WeeklyDay,
} from '@/app/actions/calendar/availability';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilityClientProps {
  initial: {
    week: WeeklyDay[];
    bufferTime: number;
    minimumNoticePeriod: number;
    maximumDaysInAdvance: number;
    overrides: { id: string; override_date: string; enabled: boolean; slots: { start: string; end: string }[]; reason: string | null }[];
    isDefault: boolean;
  };
}

export default function AvailabilityClient({ initial }: AvailabilityClientProps) {
  const [week, setWeek] = useState<WeeklyDay[]>(initial.week);
  const [bufferTime, setBufferTime] = useState(initial.bufferTime);
  const [minimumNoticePeriod, setMinimumNoticePeriod] = useState(initial.minimumNoticePeriod);
  const [maximumDaysInAdvance, setMaximumDaysInAdvance] = useState(initial.maximumDaysInAdvance);
  const [overrides, setOverrides] = useState(initial.overrides);
  const [saving, setSaving] = useState(false);

  const [overrideDate, setOverrideDate] = useState('');
  const [overrideBlocked, setOverrideBlocked] = useState(true);
  const [overrideStart, setOverrideStart] = useState('09:00');
  const [overrideEnd, setOverrideEnd] = useState('17:00');
  const [addingOverride, setAddingOverride] = useState(false);

  const updateDay = (dayOfWeek: number, patch: Partial<WeeklyDay>) => {
    setWeek((prev) => prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, ...patch } : d)));
  };

  const handleSaveWeek = async () => {
    setSaving(true);
    const res = await saveWeeklyAvailability({ week, bufferTime, minimumNoticePeriod, maximumDaysInAdvance });
    setSaving(false);
    if (res.success) {
      toast.success('Availability saved — booking pages now use these hours');
    } else {
      toast.error(res.error || 'Failed to save availability');
    }
  };

  const handleAddOverride = async () => {
    if (!overrideDate) {
      toast.error('Pick a date first');
      return;
    }
    setAddingOverride(true);
    const res = await saveDateOverride({
      date: overrideDate,
      enabled: !overrideBlocked,
      slots: !overrideBlocked ? [{ start: overrideStart, end: overrideEnd }] : [],
      reason: overrideBlocked ? 'blocked' : 'custom_hours',
    });
    setAddingOverride(false);
    if (res.success) {
      toast.success(overrideBlocked ? 'Day blocked' : 'Custom hours added');
      setOverrideDate('');
      const refreshed = await getAvailabilitySettings();
      if (refreshed.success) setOverrides(refreshed.data.overrides);
    } else {
      toast.error(res.error || 'Failed to save override');
    }
  };

  const handleDeleteOverride = async (id: string) => {
    setOverrides((prev) => prev.filter((o) => o.id !== id));
    const res = await deleteDateOverride(id);
    if (!res.success) toast.error(res.error || 'Failed to remove override');
  };

  return (
    <div className="space-y-6">
      {initial.isDefault && (
        <div className="rounded-xl border border-amber/30 bg-amber/5 p-4 text-[12px] leading-relaxed text-amber">
          No availability has been set yet — every booking page is currently running on the default Mon–Fri, 9am–5pm
          hours shown below. Save once to make these hours explicit and start customizing them.
        </div>
      )}

      {/* Weekly hours */}
      <div className="bg-white rounded-2xl border border-dash-border p-6 space-y-4">
        <h2 className="text-[15px] font-bold !text-dash-text">Weekly hours</h2>
        <div className="space-y-2.5">
          {week.map((day) => (
            <div key={day.day_of_week} className="flex items-center gap-4 py-2 border-b border-dash-border last:border-0">
              <label className="flex items-center gap-2.5 w-[130px] shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) => updateDay(day.day_of_week, { enabled: e.target.checked, slots: e.target.checked && day.slots.length === 0 ? [{ start: '09:00', end: '17:00' }] : day.slots })}
                  className="h-4 w-4 rounded border-dash-border text-dash-accent focus:ring-dash-accent cursor-pointer"
                />
                <span className={cn('text-[13px] font-semibold', day.enabled ? '!text-dash-text' : '!text-dash-textMuted')}>
                  {DAY_LABELS[day.day_of_week]}
                </span>
              </label>

              {day.enabled ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={day.slots[0]?.start ?? '09:00'}
                    onChange={(e) => updateDay(day.day_of_week, { slots: [{ start: e.target.value, end: day.slots[0]?.end ?? '17:00' }] })}
                    className="bg-white border-dash-border !text-dash-text h-9 w-[120px] text-[12px]"
                  />
                  <span className="text-[12px] !text-dash-textMuted">to</span>
                  <Input
                    type="time"
                    value={day.slots[0]?.end ?? '17:00'}
                    onChange={(e) => updateDay(day.day_of_week, { slots: [{ start: day.slots[0]?.start ?? '09:00', end: e.target.value }] })}
                    className="bg-white border-dash-border !text-dash-text h-9 w-[120px] text-[12px]"
                  />
                </div>
              ) : (
                <span className="text-[12px] !text-dash-textMuted">Unavailable</span>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-dash-border">
          <div>
            <label className="text-[11px] font-bold !text-dash-textMuted">Buffer between meetings (min)</label>
            <Input
              type="number"
              min={0}
              value={bufferTime}
              onChange={(e) => setBufferTime(Number(e.target.value))}
              className="bg-white border-dash-border !text-dash-text h-10 mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold !text-dash-textMuted">Minimum notice (min)</label>
            <Input
              type="number"
              min={0}
              value={minimumNoticePeriod}
              onChange={(e) => setMinimumNoticePeriod(Number(e.target.value))}
              className="bg-white border-dash-border !text-dash-text h-10 mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold !text-dash-textMuted">Max days in advance</label>
            <Input
              type="number"
              min={1}
              value={maximumDaysInAdvance}
              onChange={(e) => setMaximumDaysInAdvance(Number(e.target.value))}
              className="bg-white border-dash-border !text-dash-text h-10 mt-1"
            />
          </div>
        </div>

        <DashButton variant="primary" size="sm" onClick={handleSaveWeek} disabled={saving} className="mt-2">
          {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> : <Check size={14} />}
          Save availability
        </DashButton>
      </div>

      {/* Date-specific overrides */}
      <div className="bg-white rounded-2xl border border-dash-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarOff size={16} className="text-dash-accent" />
          <h2 className="text-[15px] font-bold !text-dash-text">Date-specific overrides</h2>
        </div>
        <p className="text-[12px] !text-dash-textMuted">
          Block a specific day (holiday, leave) or give it different hours than usual — this always wins over the
          weekly schedule above.
        </p>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dash-border bg-dash-surface/50 p-4">
          <div>
            <label className="text-[10px] font-bold !text-dash-textMuted">Date</label>
            <Input
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
              className="bg-white border-dash-border !text-dash-text h-10 mt-1"
            />
          </div>
          <div className="flex items-center gap-2 h-10">
            <label className="flex items-center gap-2 text-[12px] font-semibold !text-dash-text cursor-pointer">
              <input
                type="checkbox"
                checked={overrideBlocked}
                onChange={(e) => setOverrideBlocked(e.target.checked)}
                className="h-4 w-4 rounded border-dash-border text-dash-accent focus:ring-dash-accent cursor-pointer"
              />
              Block this day entirely
            </label>
          </div>
          {!overrideBlocked && (
            <div className="flex items-center gap-2">
              <Input type="time" value={overrideStart} onChange={(e) => setOverrideStart(e.target.value)} className="bg-white border-dash-border !text-dash-text h-10 w-[120px]" />
              <span className="text-[12px] !text-dash-textMuted">to</span>
              <Input type="time" value={overrideEnd} onChange={(e) => setOverrideEnd(e.target.value)} className="bg-white border-dash-border !text-dash-text h-10 w-[120px]" />
            </div>
          )}
          <DashButton variant="secondary" size="sm" onClick={handleAddOverride} disabled={addingOverride}>
            {addingOverride ? <Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> : <Plus size={14} />}
            Add
          </DashButton>
        </div>

        {overrides.length === 0 ? (
          <p className="text-[12px] !text-dash-textMuted text-center py-6">No overrides yet.</p>
        ) : (
          <div className="space-y-2">
            {overrides.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border border-dash-border px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold !text-dash-text">{o.override_date}</span>
                  {o.enabled ? (
                    <span className="text-[11px] !text-dash-textMuted">
                      Custom hours: {o.slots[0]?.start} – {o.slots[0]?.end}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-red">Blocked</span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteOverride(o.id)}
                  className="p-1.5 !text-dash-textMuted hover:!text-red hover:bg-red/5 rounded-lg transition-colors motion-reduce:transition-none"
                  aria-label="Remove override"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
