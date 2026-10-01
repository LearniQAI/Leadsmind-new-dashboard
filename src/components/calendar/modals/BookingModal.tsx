'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DashButton } from '@/components/dashboard-ui';
import { Clock, User, Check, CheckCircle2, Loader2, Video, Link as LinkIcon, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { searchContacts } from '@/app/actions/contacts';
import { createAppointment, updateAppointment } from '@/app/actions/calendar/appointments';
import { createRecurringSeries } from '@/app/actions/calendar/recurringMeetings';
import { listResources, getResourceAvailability } from '@/app/actions/calendar/resources';
import { getCalendarTypeLabel } from '@/lib/calendar/calendarTypes';
import { cn } from '@/lib/utils';
import { zonedTimeToUtc } from '@/lib/calendar/timezone';
import { apptZone, safeZone, wallClock, dayKeyInZone, formatTime12, formatTime24, tzLabel, tzShort } from '@/lib/calendar/displayTime';
import { toast } from 'sonner';

type MeetingMode = 'google_meet' | 'zoom' | 'phone' | 'in_person' | 'custom_link' | 'client_choice' | 'internal_meet';
type Step = 'agenda' | 'form' | 'review' | 'success';
type Repeat = 'none' | 'daily' | 'weekly' | 'monthly';

interface Slot { start: string; end: string; timeLabel: string }
type SlotState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; timezone: string; slots: Slot[] }
  | { status: 'error'; message: string };

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: any[];
  initialDate?: Date;
  initialAppointment?: any;
  allAppointments?: any[];
  onViewAppointment?: (apt: any) => void;
  // Task 69 — when set, this edit is a recurring-series occurrence reschedule.
  // BookingModal collects the new start time and hands it to this callback
  // (bound to the chosen scope) instead of the plain updateAppointment path.
  onSeriesReschedule?: (newStartTimeISO: string) => Promise<{ success: boolean; error?: string }>;
}

const SLOT_FETCH_TIMEOUT_MS = 20_000;
const AUX_FETCH_TIMEOUT_MS = 8_000;
const BOOKING_TIMEOUT_MS = 30_000;

class TimeoutError extends Error {}

/** Hard client-side cap on a server-action call so a hung request becomes a visible, retryable error. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError('timeout')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

const newOperationId = () => crypto.randomUUID();

// A server rejection that means "that time is gone" — the user must pick another time.
const isSlotGoneMessage = (msg: string) => /just taken|overlaps an existing|no longer available|conflicts with|outside the|minimum notice|not available/i.test(msg);

const MODE_LABELS: Record<MeetingMode, string> = {
  internal_meet: 'LeadsMind Video (Internal)',
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  custom_link: 'Custom Link / Address',
  phone: 'Phone',
  in_person: 'In person',
  client_choice: "Client's choice",
};

const labelCls = 'text-[11px] font-bold !text-dash-textMuted block mb-1.5';
const inputCls = 'bg-white border-dash-border !text-dash-text h-11';

export default function BookingModal({
  isOpen,
  onClose,
  calendars,
  initialDate,
  initialAppointment,
  allAppointments = [],
  onViewAppointment,
  onSeriesReschedule
}: BookingModalProps) {
  const isEdit = !!initialAppointment;
  const calendarsRef = useRef(calendars);
  calendarsRef.current = calendars;

  const [step, setStep] = useState<Step>('form');
  const [calendarId, setCalendarId] = useState('');
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [contactId, setContactId] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [contactResults, setContactResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [contactSearchError, setContactSearchError] = useState(false);
  const [meetingMode, setMeetingMode] = useState<MeetingMode>('internal_meet');
  const [resourceId, setResourceId] = useState('');
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatEndType, setRepeatEndType] = useState<'count' | 'date'>('count');
  const [repeatCount, setRepeatCount] = useState(4);
  const [repeatUntil, setRepeatUntil] = useState('');

  // New booking: the picked slot (exact ISO strings the server generated).
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');
  const [slotLabel, setSlotLabel] = useState('');
  const [slotState, setSlotState] = useState<SlotState>({ status: 'idle' });
  const [slotReloadKey, setSlotReloadKey] = useState(0);
  const slotReqRef = useRef(0);

  // Staff mode: a custom start/duration that does not have to be on the public slot grid. Interpreted on
  // the CALENDAR's wall clock; the server still enforces the no-overlap constraint.
  const [customOn, setCustomOn] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customDuration, setCustomDuration] = useState(30);

  // Edit mode only: free-form wall-clock times (staff reschedule is not limited to the public grid).
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const [resources, setResources] = useState<any[]>([]);
  const [resourceAvailability, setResourceAvailability] = useState<Record<string, boolean> | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false); // blocks a second submit in the same tick, before React re-renders
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booked, setBooked] = useState<any>(null);
  // One operation id per dialog open. Reused verbatim on retry so a replay returns the original
  // booking; only replaced after success, on reopen, or if the user changed what they're booking
  // after an attempt (so an earlier, possibly-saved booking is never returned for a different slot).
  const opRef = useRef<{ id: string; fingerprint: string | null }>({ id: newOperationId(), fingerprint: null });

  const browserTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const selectedCalendar = calendars.find((c) => c.id === calendarId);
  const slotTimezone = slotState.status === 'ready' ? slotState.timezone : safeZone(selectedCalendar?.timezone);
  // Edit mode interprets the time fields on the calendar's wall clock (falls back to the meeting's own zone).
  const editTz = safeZone(selectedCalendar?.timezone ?? (initialAppointment ? apptZone(initialAppointment).timeZone : 'UTC'));
  const customDurationOptions = [15, 30, 45, 60, 90, 120];

  // 1. Reset everything each time the dialog opens (NOT on every parent re-render — the old effect
  // depended on `calendars`/`allAppointments` and could wipe the user's input mid-edit).
  useEffect(() => {
    if (!isOpen) return;
    opRef.current = { id: newOperationId(), fingerprint: null };
    submittingRef.current = false;
    setSubmitting(false);
    setSubmitError(null);
    setBooked(null);
    setContactResults([]);
    setContactSearchError(false);
    setSlotStart(''); setSlotEnd(''); setSlotLabel('');
    setCustomOn(false); setCustomStart(''); setCustomDuration(30);
    setSlotState({ status: 'idle' });
    setRepeat('none'); setRepeatInterval(1); setRepeatEndType('count'); setRepeatCount(4); setRepeatUntil('');

    const cals = calendarsRef.current;
    if (initialAppointment) {
      setStep('form');
      setCalendarId(initialAppointment.calendar_id || '');
      setContactId(initialAppointment.contact_id || '');
      setSelectedContact(initialAppointment.contact ? { id: initialAppointment.contact_id, ...initialAppointment.contact } : null);
      setTitle(initialAppointment.title || '');
      // The calendar's wall clock, not the browser's.
      const zone = apptZone(initialAppointment).timeZone;
      setDate(wallClock(initialAppointment.start_time, zone).date);
      setEditStart(formatTime24(initialAppointment.start_time, zone));
      setEditEnd(formatTime24(initialAppointment.end_time, zone));
      setMeetingMode(initialAppointment.meeting_mode || 'internal_meet');
      setResourceId(initialAppointment.resource_id || '');
      return;
    }

    const onlyCalendar = cals.length === 1 ? cals[0] : null;
    setCalendarId(onlyCalendar?.id || '');
    setContactId('');
    setSelectedContact(null);
    setTitle('');
    setResourceId('');
    setMeetingMode(onlyCalendar?.meeting_mode || 'internal_meet');
    setEditStart(''); setEditEnd('');
    if (initialDate) {
      const dateStr = format(initialDate, 'yyyy-MM-dd');
      setDate(dateStr);
      const hasEvents = allAppointments.some((apt) => dayKeyInZone(apt.start_time, apptZone(apt).timeZone) === dateStr);
      setStep(hasEvents ? 'agenda' : 'form');
    } else {
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setStep('form');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on open/target only; see comment above
  }, [isOpen, initialAppointment?.id, initialDate?.getTime()]);

  // 2. Load the workspace's active rooms/desks/equipment once per open (best effort).
  useEffect(() => {
    if (!isOpen) return;
    withTimeout(listResources(), AUX_FETCH_TIMEOUT_MS)
      .then((res: any) => { if (res.success) setResources(res.data); })
      .catch(() => { /* resources are optional — the dialog works without them */ });
  }, [isOpen]);

  // 3. Calendar change -> that calendar's default meeting mode (new bookings only).
  useEffect(() => {
    if (isEdit || !calendarId) return;
    const cal = calendarsRef.current.find((c) => c.id === calendarId);
    if (cal?.meeting_mode) setMeetingMode(cal.meeting_mode);
  }, [calendarId, isEdit]);

  // 4. Availability for calendar + date. Any change of either clears the picked time, so a stale
  // time from another day/calendar can never be submitted.
  useEffect(() => {
    if (!isOpen || isEdit) return;
    setSlotStart(''); setSlotEnd(''); setSlotLabel('');
    if (!calendarId || !date) {
      slotReqRef.current++;
      setSlotState({ status: 'idle' });
      return;
    }
    const reqId = ++slotReqRef.current;
    setSlotState({ status: 'loading' });
    // A real fetch (not a server action) so the hard timeout actually cancels the request and a Retry
    // is never queued behind a hung one. Leaving the calendar/date (or closing) cancels it too.
    const controller = new AbortController();
    const signal = typeof AbortSignal.any === 'function'
      ? AbortSignal.any([controller.signal, AbortSignal.timeout(SLOT_FETCH_TIMEOUT_MS)])
      : controller.signal;
    fetch(`/api/calendar/slots?calendarId=${encodeURIComponent(calendarId)}&date=${encodeURIComponent(date)}`, { signal, cache: 'no-store' })
      .then((r) => r.json())
      .then((res: any) => {
        if (reqId !== slotReqRef.current) return; // a newer calendar/date superseded this response
        if (res.success) setSlotState({ status: 'ready', timezone: res.data.timezone, slots: res.data.slots });
        else setSlotState({ status: 'error', message: res.error || 'Could not load availability.' });
      })
      .catch((err) => {
        if (reqId !== slotReqRef.current || controller.signal.aborted) return; // superseded / closed — not an error
        setSlotState({
          status: 'error',
          message: err?.name === 'TimeoutError'
            ? 'Loading availability timed out. Check your connection and try again.'
            : 'Could not load availability. Please try again.',
        });
      });
    return () => controller.abort();
  }, [isOpen, isEdit, calendarId, date, slotReloadKey]);

  // 4b. Custom staff time -> the effective selection (runs after 4, which clears the picked slot on a date change).
  useEffect(() => {
    if (!isOpen || isEdit || !customOn) return;
    const m = customStart.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
    if (!m || !date) { setSlotStart(''); setSlotEnd(''); setSlotLabel(''); return; }
    const hhmm = `${m[1].padStart(2, '0')}:${m[2]}`;
    const start = zonedTimeToUtc(date, hhmm, slotTimezone);
    const end = new Date(start.getTime() + customDuration * 60_000);
    setSlotStart(start.toISOString()); setSlotEnd(end.toISOString()); setSlotLabel(formatTime12(start, slotTimezone));
  }, [isOpen, isEdit, customOn, customStart, customDuration, date, slotTimezone]);

  // 5. Resource availability for the chosen time (debounced, best effort — DB constraint is the guarantee).
  const resourceWindow = useMemo(() => {
    if (isEdit) {
      if (!date || !editStart || !editEnd) return null;
      const s = zonedTimeToUtc(date, editStart, editTz); const e = zonedTimeToUtc(date, editEnd, editTz);
      return isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s ? null : { start: s.toISOString(), end: e.toISOString() };
    }
    return slotStart && slotEnd ? { start: slotStart, end: slotEnd } : null;
  }, [isEdit, date, editStart, editEnd, editTz, slotStart, slotEnd]);

  useEffect(() => {
    if (!isOpen || resources.length === 0 || !resourceWindow) { setResourceAvailability(null); return; }
    let cancelled = false;
    setCheckingAvailability(true);
    const timer = setTimeout(async () => {
      try {
        const res: any = await withTimeout(getResourceAvailability(resourceWindow.start, resourceWindow.end, initialAppointment?.id), AUX_FETCH_TIMEOUT_MS);
        if (cancelled) return;
        if (!res.success) return;
        const map: Record<string, boolean> = {};
        for (const r of res.data as any[]) map[r.id] = r.available;
        setResourceAvailability(map);
        setResourceId((current) => {
          if (current && map[current] === false) {
            const name = resources.find((r) => r.id === current)?.name || 'That resource';
            toast.warning(`${name} is no longer available for this time — please choose another.`);
            return '';
          }
          return current;
        });
      } catch { /* best-effort courtesy — a failed check leaves resources shown as available */ }
      finally { if (!cancelled) setCheckingAvailability(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); setCheckingAvailability(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `resources` identity is stable per open
  }, [isOpen, resources.length, resourceWindow?.start, resourceWindow?.end, initialAppointment?.id]);

  // Debounced contact search with a hard timeout and a visible failure.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchContacts = useCallback((query: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setContactSearchError(false);
    if (query.trim().length < 1) { setContactResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res: any = await withTimeout(searchContacts(query.trim()), AUX_FETCH_TIMEOUT_MS);
        if (res.success) setContactResults(res.data); else setContactSearchError(true);
      } catch {
        setContactSearchError(true);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  }, []);
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  const selectContact = (contact: any) => {
    setContactId(contact.id);
    setSelectedContact(contact);
    setContactResults([]);
  };
  const clearContact = () => { setContactId(''); setSelectedContact(null); setContactResults([]); };

  // ---- validity -------------------------------------------------------------
  const titleOk = title.trim().length >= 3;
  const editTimesOk = !!(date && editStart && editEnd && editEnd > editStart);
  // Calendar, date and a real slot are all required before Review / Confirm unlock.
  const inFuture = !!slotStart && new Date(slotStart).getTime() > Date.now();
  const newBookingValid = !!(calendarId && date && slotStart && slotEnd) && inFuture && titleOk;
  const editValid = !!calendarId && editTimesOk && titleOk;
  const isCustomSelection = !isEdit && customOn && !!slotStart;
  const repeatValid = repeat === 'none' || (repeatEndType === 'count' ? repeatCount >= 2 && repeatCount <= 60 : !!repeatUntil) && repeatInterval >= 1 && repeatInterval <= 52;
  const canSubmit = (isEdit ? editValid : newBookingValid) && repeatValid && !submitting;

  const fingerprint = JSON.stringify([calendarId, date, slotStart, slotEnd, title.trim(), contactId, meetingMode, resourceId, repeat]);

  const submit = async () => {
    if (submittingRef.current) return; // second click in the same tick
    if (!(isEdit ? editValid : newBookingValid) || !repeatValid) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      let res: any;
      if (isEdit) {
        const start = zonedTimeToUtc(date, editStart, editTz);
        const end = zonedTimeToUtc(date, editEnd, editTz);
        res = onSeriesReschedule
          ? await withTimeout(onSeriesReschedule(start.toISOString()), BOOKING_TIMEOUT_MS)
          : await withTimeout(updateAppointment(initialAppointment.id, {
              title: title.trim(),
              calendar_id: calendarId,
              start_time: start.toISOString(),
              end_time: end.toISOString(),
              meeting_mode: meetingMode,
              resource_id: resourceId || null,
            }), BOOKING_TIMEOUT_MS);
        if (res.success) {
          toast.success('Appointment updated');
          onClose();
        } else {
          setSubmitError(res.error || 'Could not save the appointment. Your changes are still here — try again.');
        }
        return;
      }

      if (opRef.current.fingerprint && opRef.current.fingerprint !== fingerprint) {
        opRef.current = { id: newOperationId(), fingerprint: null };
      }
      opRef.current.fingerprint = fingerprint;

      if (repeat !== 'none') {
        res = await withTimeout(createRecurringSeries({
          calendarId,
          contactId: contactId || null,
          title: title.trim(),
          startTime: slotStart,
          endTime: slotEnd,
          meetingMode,
          clientOperationId: opRef.current.id,
          recurrence: {
            frequency: repeat,
            interval: repeatInterval,
            count: repeatEndType === 'count' ? repeatCount : null,
            until: repeatEndType === 'date' && repeatUntil ? new Date(`${repeatUntil}T23:59:59`).toISOString() : null,
          },
        }), BOOKING_TIMEOUT_MS);
      } else {
        res = await withTimeout(createAppointment({
          calendarId,
          contactId: contactId || undefined,
          title: title.trim(),
          startTime: slotStart,
          endTime: slotEnd,
          meetingMode,
          resourceId: resourceId || null,
          clientOperationId: opRef.current.id,
          // Staff booking: custom times / inside the notice window / beyond the booking horizon are allowed.
          // The no-overlap constraint is still enforced by the database.
          staffBooking: true,
        }), BOOKING_TIMEOUT_MS);
      }

      if (res.success) {
        setBooked(res.data || {});
        for (const w of (res.data?.warnings ?? []) as string[]) toast.warning(w);
        if (repeat !== 'none' && res.data) {
          const { occurrencesCreated, occurrencesSkipped } = res.data;
          toast.success(
            `Recurring meeting created — ${occurrencesCreated} occurrence${occurrencesCreated === 1 ? '' : 's'}` +
            (occurrencesSkipped ? ` (${occurrencesSkipped} skipped for conflicts)` : '')
          );
        }
        opRef.current = { id: newOperationId(), fingerprint: null }; // consumed — next booking is a new operation
        setStep('success');
      } else {
        const message: string = res.error || 'Could not complete the booking. Your selections are still here — try again.';
        setSubmitError(message);
        if (isSlotGoneMessage(message)) {
          // The time is gone: send them back to pick another, with fresh availability. Everything else is kept.
          setStep('form');
          setSlotReloadKey((k) => k + 1);
        }
      }
    } catch (err) {
      setSubmitError(
        err instanceof TimeoutError
          ? 'This is taking longer than expected. Your booking may already have been saved — press Confirm again to retry safely; it will not create a duplicate.'
          : 'Network problem — nothing was lost. Check your connection and press Confirm again.'
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // ---- render helpers ---------------------------------------------------------
  // Changing Start slides End by the same amount, so the meeting keeps its length instead of ending up before it starts.
  const onEditStartChange = (next: string) => {
    const toMin = (v: string) => { const m = v.match(/^([0-9]{1,2}):([0-9]{2})$/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
    const prevStart = toMin(editStart); const prevEnd = toMin(editEnd); const nextStart = toMin(next);
    setEditStart(next);
    if (prevStart !== null && prevEnd !== null && nextStart !== null && prevEnd > prevStart) {
      const end = Math.min(nextStart + (prevEnd - prevStart), 23 * 60 + 59);
      setEditEnd(`${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`);
    }
  };
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const prettyDate = date ? format(parseISO(date), 'EEE, MMM d, yyyy') : '';

  const handleOpenChange = (open: boolean) => {
    if (!open && submittingRef.current) return; // don't drop a booking that's in flight
    if (!open) onClose();
  };

  const modeOptions = (Object.keys(MODE_LABELS) as MeetingMode[]).filter((m) =>
    ['internal_meet', 'google_meet', 'zoom', 'custom_link'].includes(m) || m === meetingMode
  );

  const renderSlotPicker = () => (
    <div>
      <span className={labelCls}>Time</span>
      {/* Fixed-height region so loading / empty / error / ready don't make the dialog jump. */}
      <div className="min-h-[132px] rounded-xl border border-dash-border bg-dash-surface/40 p-3" aria-live="polite">
        {slotState.status === 'idle' && (
          <p className="text-[12px] !text-dash-textMuted">Choose a calendar and a date to see available times.</p>
        )}
        {slotState.status === 'loading' && (
          <div className="grid grid-cols-4 gap-2" aria-busy="true" aria-label="Loading availability">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-dash-border/60 animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        )}
        {slotState.status === 'error' && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-[12px] !text-red flex items-start gap-1.5"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {slotState.message}</p>
            <DashButton variant="secondary" size="sm" onClick={() => setSlotReloadKey((k) => k + 1)}>
              <RefreshCw size={14} /> Retry
            </DashButton>
          </div>
        )}
        {slotState.status === 'ready' && slotState.slots.length === 0 && (
          <div>
            <p className="text-[13px] font-bold !text-dash-text">No availability on this date</p>
            <p className="text-[12px] !text-dash-textMuted mt-1">Try another date, or use a custom time below — staff can book outside the public hours.</p>
          </div>
        )}
        {slotState.status === 'ready' && slotState.slots.length > 0 && (
          <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto pr-1" role="listbox" aria-label="Available times">
            {slotState.slots.map((s) => {
              const active = s.start === slotStart;
              return (
                <button
                  key={s.start}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { setCustomOn(false); setSlotStart(s.start); setSlotEnd(s.end); setSlotLabel(s.timeLabel); setSubmitError(null); }}
                  className={cn(
                    'h-9 rounded-lg border text-[12px] font-bold transition-colors motion-reduce:transition-none',
                    active
                      ? 'bg-dash-accent border-dash-accent !text-white'
                      : 'bg-white border-dash-border !text-dash-text hover:border-dash-accent'
                  )}
                >
                  {s.timeLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-2">
        <button
          type="button"
          onClick={() => { setCustomOn((v) => !v); setSlotStart(''); setSlotEnd(''); setSlotLabel(''); setSubmitError(null); }}
          className="text-[12px] font-bold text-dash-accent hover:underline"
          aria-expanded={customOn}
        >
          {customOn ? '← Back to available times' : 'Need a different time? Use a custom time'}
        </button>
        {customOn && (
          <div className="mt-2 rounded-xl border border-dash-border bg-white p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold !text-dash-textMuted block mb-1" htmlFor="custom-start">Start (24h, {tzShort(slotTimezone, date ? `${date}T12:00:00Z` : undefined)})</label>
                <Input
                  id="custom-start"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="HH:MM e.g. 14:15"
                  maxLength={5}
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value.replace(/[^0-9:]/g, ''))}
                  className="bg-white border-dash-border !text-dash-text h-10 px-3"
                />
                {customStart && !/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(customStart) && <p className="text-[10px] !text-red mt-1">Use 24-hour HH:MM.</p>}
              </div>
              <div>
                <span className="text-[10px] font-bold !text-dash-textMuted block mb-1">Duration</span>
                <Select value={String(customDuration)} onValueChange={(v) => setCustomDuration(Number(v))}>
                  <SelectTrigger className="bg-white border-dash-border !text-dash-text h-10" aria-label="Duration"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-dash-border z-[1100]">
                    {customDurationOptions.map((m) => <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[11px] !text-dash-textMuted">
              Custom times skip the public booking hours, minimum notice and booking window. A time that overlaps an existing booking on this calendar is still rejected.
            </p>
            {slotStart && !inFuture && <p className="text-[11px] !text-red">That time is in the past — pick a future time.</p>}
          </div>
        )}
      </div>
      <p className="text-[11px] !text-dash-textMuted mt-1.5">
        Times shown in <span className="font-bold !text-dash-text">{slotTimezone}</span> (the calendar's timezone)
        {browserTz && browserTz !== slotTimezone ? <> · your browser is in {browserTz}</> : null}
      </p>
    </div>
  );

  const renderContactField = () => (
    <div>
      <span className={labelCls}>Contact / Client (optional)</span>
      <div className="relative">
        {selectedContact ? (
          <div className="flex items-center justify-between bg-white border border-dash-accent rounded-lg h-11 px-4 text-[13px] !text-dash-text">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 shrink-0 rounded-full bg-dash-accent flex items-center justify-center text-[10px] font-bold text-white">
                {(selectedContact.first_name?.[0] || '?')}{(selectedContact.last_name?.[0] || '')}
              </div>
              <span className="font-bold truncate">{selectedContact.first_name} {selectedContact.last_name}</span>
              {selectedContact.email && <span className="!text-dash-textMuted text-[11px] truncate">({selectedContact.email})</span>}
            </div>
            <button type="button" onClick={clearContact} className="!text-dash-textMuted hover:text-red text-[10px] font-bold shrink-0 ml-2">
              Change
            </button>
          </div>
        ) : (
          <>
            <Input
              className={cn(inputCls, 'pl-10')}
              placeholder="Search by name or email..."
              autoComplete="off"
              onChange={(e) => handleSearchContacts(e.target.value)}
            />
            <User size={16} className="absolute left-3 top-3 !text-dash-textMuted" />
            {isSearching && <Loader2 className="absolute right-3 top-3 animate-spin motion-reduce:animate-none text-dash-accent" size={16} />}
          </>
        )}
      </div>
      {contactSearchError && !selectedContact && (
        <p className="text-[11px] !text-red mt-1">Contact search failed — try typing again. You can also book without a contact.</p>
      )}
      {!selectedContact && contactResults.length > 0 && (
        <div className="mt-2 bg-white border border-dash-border rounded-lg overflow-hidden max-h-[150px] overflow-y-auto shadow-xl">
          {contactResults.map((c) => (
            <button
              type="button"
              key={c.id}
              className="w-full text-left p-3 text-[12px] hover:bg-dash-surface border-b border-dash-border last:border-0 flex flex-col gap-0.5"
              onClick={() => selectContact(c)}
            >
              <span className="font-bold !text-dash-text">{c.first_name} {c.last_name}</span>
              <span className="!text-dash-textMuted text-[11px]">{c.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
      <div>
        <span className={labelCls}>Booking Page (calendar)</span>
        <Select value={calendarId} onValueChange={(v) => { setCalendarId(v); setSubmitError(null); }}>
          <SelectTrigger className={inputCls} aria-label="Calendar">
            <SelectValue placeholder="Select a calendar" />
          </SelectTrigger>
          <SelectContent className="bg-white border-dash-border z-[1100]">
            {calendars.map((cal) => (
              <SelectItem key={cal.id} value={cal.id}>
                {cal.name} · {getCalendarTypeLabel(cal.calendar_type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className={labelCls} htmlFor="booking-date">Date</label>
        <Input
          id="booking-date"
          type="date"
          value={date}
          min={isEdit ? undefined : todayStr}
          onChange={(e) => { setDate(e.target.value); setSubmitError(null); }}
          className={cn(inputCls, 'px-3')}
        />
      </div>

      {isEdit ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="edit-start">Start ({tzShort(editTz, date ? `${date}T12:00:00Z` : undefined)})</label>
            <Input id="edit-start" type="time" value={editStart} onChange={(e) => onEditStartChange(e.target.value)} className={cn(inputCls, 'px-3')} />
          </div>
          <div>
            <label className={labelCls} htmlFor="edit-end">End ({tzShort(editTz, date ? `${date}T12:00:00Z` : undefined)})</label>
            <Input id="edit-end" type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className={cn(inputCls, 'px-3')} />
            {editStart && editEnd && editEnd <= editStart && <p className="text-[10px] !text-red mt-1">End must be after start.</p>}
          </div>
        </div>
      ) : renderSlotPicker()}

      <div>
        <label className={labelCls} htmlFor="booking-title">Meeting Title</label>
        <Input id="booking-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Discovery Call" />
        {title.length > 0 && !titleOk && <p className="text-[10px] !text-red mt-1">Title needs at least 3 characters.</p>}
      </div>

      {renderContactField()}

      <div>
        <span className={labelCls}>Meeting Mode</span>
        <Select value={meetingMode} onValueChange={(v) => setMeetingMode(v as MeetingMode)}>
          <SelectTrigger className={inputCls} aria-label="Meeting mode"><SelectValue placeholder="Select mode" /></SelectTrigger>
          <SelectContent className="bg-white border-dash-border z-[1100]">
            {modeOptions.map((m) => (
              <SelectItem key={m} value={m}>
                <div className="flex items-center gap-2">
                  {m === 'internal_meet' ? <Sparkles size={14} className="text-dash-accent" /> : m === 'custom_link' ? <LinkIcon size={14} className="!text-dash-textMuted" /> : <Video size={14} className="text-blue-500" />}
                  {MODE_LABELS[m]}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {resources.length > 0 && (
        <div>
          <span className={cn(labelCls, 'flex items-center gap-2')}>
            Room / resource (optional)
            {checkingAvailability && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium !text-dash-textMuted normal-case">
                <Loader2 size={10} className="animate-spin motion-reduce:animate-none" /> Checking availability…
              </span>
            )}
          </span>
          <Select value={resourceId || '__none'} onValueChange={(v) => setResourceId(v === '__none' ? '' : v)}>
            <SelectTrigger className={inputCls} aria-label="Room or resource"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent className="bg-white border-dash-border z-[1100]">
              <SelectItem value="__none">None</SelectItem>
              {resources.map((r) => {
                const isAvailable = resourceAvailability ? resourceAvailability[r.id] !== false : true;
                return (
                  <SelectItem key={r.id} value={r.id} disabled={!isAvailable}>
                    <span className="capitalize !text-dash-textMuted mr-1.5">{r.type}</span>
                    {r.name}{r.location ? ` · ${r.location}` : ''}
                    {!isAvailable && <span className="ml-1.5 text-red font-semibold">· booked at this time</span>}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {!isEdit && (
        <div className="space-y-3 rounded-xl border border-dash-border bg-dash-surface/40 p-3">
          <div>
            <span className={labelCls}>Repeat</span>
            <Select value={repeat} onValueChange={(v) => setRepeat(v as Repeat)}>
              <SelectTrigger className={inputCls} aria-label="Repeat"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border-dash-border z-[1100]">
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {repeat !== 'none' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold !text-dash-textMuted block mb-1" htmlFor="rep-int">
                  Every (× {repeat === 'daily' ? 'days' : repeat === 'weekly' ? 'weeks' : 'months'})
                </label>
                <Input id="rep-int" type="number" min={1} max={52} value={repeatInterval} onChange={(e) => setRepeatInterval(Number(e.target.value))} className="bg-white border-dash-border !text-dash-text h-10 px-2" />
              </div>
              <div>
                <span className="text-[10px] font-bold !text-dash-textMuted block mb-1">Ends</span>
                <Select value={repeatEndType} onValueChange={(v) => setRepeatEndType(v as 'count' | 'date')}>
                  <SelectTrigger className="bg-white border-dash-border !text-dash-text h-10" aria-label="Repeat ends"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-dash-border z-[1100]">
                    <SelectItem value="count">After N occurrences</SelectItem>
                    <SelectItem value="date">On a date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {repeatEndType === 'count' ? (
                <div>
                  <label className="text-[10px] font-bold !text-dash-textMuted block mb-1" htmlFor="rep-count">Occurrences (2–60)</label>
                  <Input id="rep-count" type="number" min={2} max={60} value={repeatCount} onChange={(e) => setRepeatCount(Number(e.target.value))} className="bg-white border-dash-border !text-dash-text h-10 px-2" />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold !text-dash-textMuted block mb-1" htmlFor="rep-until">End date</label>
                  <Input id="rep-until" type="date" value={repeatUntil} min={date || todayStr} onChange={(e) => setRepeatUntil(e.target.value)} className="bg-white border-dash-border !text-dash-text h-10 px-2" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {submitError && (
        <div role="alert" className="rounded-lg border border-red/30 bg-red/5 p-3 text-[12px] !text-red flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span>{submitError}</span>
        </div>
      )}
    </div>
  );

  const reviewRow = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-dash-border last:border-0">
      <span className="text-[11px] font-bold !text-dash-textMuted shrink-0">{label}</span>
      <span className="text-[13px] font-bold !text-dash-text text-right break-words min-w-0">{value}</span>
    </div>
  );

  const renderReview = () => (
    <div className="py-4 space-y-4">
      <div className="rounded-xl border border-dash-border bg-white px-4">
        {reviewRow('Calendar', selectedCalendar ? selectedCalendar.name : '—')}
        {reviewRow('Title', title.trim())}
        {reviewRow('Date', prettyDate)}
        {reviewRow('Time', `${slotLabel} – ${slotEnd ? formatTime12(slotEnd, slotTimezone) : ''}`)}
        {reviewRow('Timezone', tzLabel(slotTimezone, slotStart || undefined))}
        {isCustomSelection && reviewRow('Custom time', 'Outside the public booking slots')}
        {reviewRow('Contact', selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : 'None')}
        {reviewRow('Meeting mode', MODE_LABELS[meetingMode])}
        {resourceId && reviewRow('Resource', resources.find((r) => r.id === resourceId)?.name || '')}
        {repeat !== 'none' && reviewRow('Repeats', `${repeat}${repeatEndType === 'count' ? `, ${repeatCount} times` : `, until ${repeatUntil}`}`)}
      </div>
      {submitError && (
        <div role="alert" className="rounded-lg border border-red/30 bg-red/5 p-3 text-[12px] !text-red flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span>{submitError}</span>
        </div>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="py-8 flex flex-col items-center text-center gap-3">
      <CheckCircle2 size={44} className="text-green" />
      <p className="text-[18px] font-bold !text-dash-text">{repeat !== 'none' ? 'Recurring meeting booked' : 'Appointment booked'}</p>
      <p className="text-[13px] !text-dash-textMuted">
        {title.trim()} · {prettyDate} · {slotLabel} ({tzLabel(slotTimezone, slotStart || undefined)})
      </p>
      {Array.isArray(booked?.warnings) && booked.warnings.length > 0 && (
        <ul className="text-left text-[12px] !text-amber space-y-1 max-w-[420px]" data-testid="booking-warnings">
          {booked.warnings.map((w: string) => <li key={w} className="flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}</li>)}
        </ul>
      )}
      <DashButton variant="primary" size="lg" className="mt-2 px-10" onClick={onClose}>Done</DashButton>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] z-[1002] bg-white border-dash-border !text-dash-text">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold text-dash-accent flex items-center justify-between pr-6">
            {step === 'agenda' ? (
              <span>Daily <span className="!text-dash-text">Agenda</span></span>
            ) : step === 'success' ? (
              <span>Booking <span className="!text-dash-text">confirmed</span></span>
            ) : step === 'review' ? (
              <span>Review <span className="!text-dash-text">booking</span></span>
            ) : (
              <span>{isEdit ? 'Edit' : 'Book'} <span className="!text-dash-text">Appointment</span></span>
            )}
            {initialDate && step === 'agenda' && (
              <span className="text-[12px] font-medium !text-dash-textMuted normal-case tracking-normal">
                {format(initialDate, 'MMM do, yyyy')}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'agenda' && (
          <div className="py-6 space-y-6">
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {allAppointments
                .filter((apt) => dayKeyInZone(apt.start_time, apptZone(apt).timeZone) === date)
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                .map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => onViewAppointment?.(apt)}
                    className="group p-4 bg-dash-surface border border-dash-border rounded-xl hover:border-dash-accent transition-all motion-reduce:transition-none cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-full bg-dash-accent/10 flex items-center justify-center text-dash-accent">
                        <Clock size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold !text-dash-text group-hover:text-dash-accent transition-colors motion-reduce:transition-none truncate">{apt.title}</p>
                        <p className="text-[11px] !text-dash-textMuted flex items-center gap-1.5 mt-0.5 font-bold">
                          {formatTime12(apt.start_time, apptZone(apt).timeZone)} - {formatTime12(apt.end_time, apptZone(apt).timeZone)} {tzShort(apptZone(apt).timeZone, apt.start_time)}
                        </p>
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded bg-white border border-dash-border text-[9px] font-bold !text-dash-textMuted shrink-0 ml-2">
                      {apt.calendar?.name || 'Meeting'}
                    </div>
                  </div>
                ))}
            </div>
            <DashButton onClick={() => setStep('form')} variant="primary" size="lg" className="w-full">
              <Sparkles size={16} /> Add New Session
            </DashButton>
          </div>
        )}

        {step === 'form' && (
          <>
            {renderForm()}
            <DialogFooter className="border-t border-dash-border pt-4 mt-2 gap-2">
              {!isEdit && date && allAppointments.some((apt) => dayKeyInZone(apt.start_time, apptZone(apt).timeZone) === date) && (
                <DashButton variant="ghost" onClick={() => setStep('agenda')} className="flex-1">Back to Agenda</DashButton>
              )}
              {isEdit ? (
                <DashButton variant="primary" onClick={submit} disabled={!canSubmit} className="px-8">
                  {submitting ? <><Loader2 className="animate-spin motion-reduce:animate-none" size={16} /> Saving...</> : <><Check size={16} /> Save changes</>}
                </DashButton>
              ) : (
                <DashButton variant="primary" onClick={() => { setSubmitError(null); setStep('review'); }} disabled={!newBookingValid || !repeatValid} className="px-8">
                  Review booking
                </DashButton>
              )}
            </DialogFooter>
          </>
        )}

        {step === 'review' && (
          <>
            {renderReview()}
            <DialogFooter className="border-t border-dash-border pt-4 mt-2 gap-2">
              <DashButton variant="ghost" onClick={() => setStep('form')} disabled={submitting} className="flex-1">Back</DashButton>
              <DashButton variant="primary" onClick={submit} disabled={!canSubmit} className="px-8">
                {submitting ? <><Loader2 className="animate-spin motion-reduce:animate-none" size={16} /> Booking...</> : <><Check size={16} /> Confirm booking</>}
              </DashButton>
            </DialogFooter>
          </>
        )}

        {step === 'success' && renderSuccess()}
      </DialogContent>
    </Dialog>
  );
}
