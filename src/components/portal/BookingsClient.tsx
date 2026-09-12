'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Calendar, Video, Clock, ChevronRight, AlertCircle, X, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { bookAppointmentFromPortal, cancelAppointmentFromPortal, cancelMyClassSpot, rescheduleAppointmentFromPortal } from '@/app/actions/portalBookings';
import { fetchPublicSlots } from '@/app/actions/calendar/public';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BookingsClientProps {
  initialAppointments: any[];
  calendars: any[];
}

export default function BookingsClient({ initialAppointments, calendars }: BookingsClientProps) {
  const [appointments, setAppointments] = useState<any[]>(initialAppointments);
  const [selectedCalendar, setSelectedCalendar] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  
  // Rescheduling state
  const [reschedulingAppt, setReschedulingAppt] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState<Date>(new Date());

  // Update clock every 5 seconds for meeting lounge countdown precision
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch slots when date or calendar selection changes for NEW bookings
  useEffect(() => {
    if (!selectedCalendar) return;
    async function loadSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const data = await fetchPublicSlots(selectedCalendar.id, selectedDate);
        setSlots(data || []);
      } catch (err) {
        toast.error("Failed to load available time slots.");
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [selectedCalendar, selectedDate]);

  // Fetch slots for RESCHEDULING selection
  useEffect(() => {
    if (!reschedulingAppt) return;
    async function loadRescheduleSlots() {
      setLoadingRescheduleSlots(true);
      setSelectedRescheduleSlot(null);
      try {
        const data = await fetchPublicSlots(reschedulingAppt.calendar_id, rescheduleDate);
        setRescheduleSlots(data || []);
      } catch (err) {
        toast.error("Failed to load reschedule slots.");
      } finally {
        setLoadingRescheduleSlots(false);
      }
    }
    loadRescheduleSlots();
  }, [reschedulingAppt, rescheduleDate]);

  // Format local date display
  const formatLocalDate = (isoStr: string) => {
    try {
      const date = parseISO(isoStr);
      return date.toLocaleDateString('en-ZA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  // 1. Submit New Booking
  const handleCreateBooking = async () => {
    if (!selectedCalendar || !selectedSlot) {
      toast.error("Please select a date and time slot first.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await bookAppointmentFromPortal({
          calendarId: selectedCalendar.id,
          slot: selectedSlot,
          notes: notes
        });

        if (res.success) {
          if (res.checkoutRequired && res.redirectUrl) {
            toast.info("Consultation fee required. Redirecting to PayFast...");
            window.location.href = res.redirectUrl;
          } else {
            toast.success("Consultation booked successfully!");
            window.location.reload();
          }
        } else {
          toast.error(res.error || "Failed to schedule appointment.");
        }
      } catch (err: any) {
        toast.error("Error creating booking: " + err.message);
      }
    });
  };

  // 2. Submit Cancellation
  const handleCancelBooking = async (appt: any) => {
    const isGroupAttendee = !!appt._isGroupAttendee;
    if (!window.confirm(
      isGroupAttendee
        ? "Cancel your spot for this session? The session itself will still go ahead."
        : "Are you sure you want to cancel this consultation meeting?"
    )) {
      return;
    }

    startTransition(async () => {
      try {
        const res = isGroupAttendee
          ? await cancelMyClassSpot(appt.id)
          : await cancelAppointmentFromPortal(appt.id);
        if (res.success) {
          toast.success(isGroupAttendee ? "Your spot has been cancelled." : "Appointment cancelled successfully.");
          setAppointments(appointments.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a));
        } else {
          toast.error(res.error || "Failed to cancel appointment.");
        }
      } catch (err: any) {
        toast.error("Error cancelling appointment: " + err.message);
      }
    });
  };

  // 3. Submit Rescheduling update
  const handleRescheduleBooking = async () => {
    if (!reschedulingAppt || !selectedRescheduleSlot) {
      toast.error("Please select a new time slot.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await rescheduleAppointmentFromPortal(reschedulingAppt.id, selectedRescheduleSlot);
        if (res.success) {
          toast.success("Appointment rescheduled successfully!");
          setReschedulingAppt(null);
          window.location.reload();
        } else {
          toast.error(res.error || "Failed to reschedule appointment.");
        }
      } catch (err: any) {
        toast.error("Error saving reschedule details: " + err.message);
      }
    });
  };

  // Lounge countdown checker
  const getMeetingLoungeStatus = (startTimeStr: string) => {
    const startTime = new Date(startTimeStr);
    const diffSeconds = differenceInSeconds(startTime, now);
    const fifteenMins = 15 * 60;

    // Meeting already started (up to 1 hour past)
    if (diffSeconds <= 0 && diffSeconds > -3600) {
      return { unlock: true, label: "Live Room Open" };
    }
    // Unlocks in less than 15 minutes
    if (diffSeconds > 0 && diffSeconds <= fifteenMins) {
      const minsLeft = Math.ceil(diffSeconds / 60);
      return { unlock: true, label: `Lounge Open (Starts in ${minsLeft}m)` };
    }
    // Still locked
    if (diffSeconds > fifteenMins) {
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      let timeStr = "";
      if (hours > 24) {
        timeStr = `${Math.floor(hours / 24)}d left`;
      } else if (hours > 0) {
        timeStr = `${hours}h ${minutes}m left`;
      } else {
        timeStr = `${minutes}m left`;
      }
      return { unlock: false, label: `Lounge Opens in ${timeStr}` };
    }
    // Outdated/ended
    return { unlock: false, label: "Session Ended" };
  };

  return (
    <div className="space-y-10">
      {/* ── TOP SECTION: SCHEDULED MEETINGS & VIRTUAL LOUNGE ── */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-dash-textMuted uppercase tracking-[1.5px] mb-2 flex items-center gap-1.5">
          <Calendar size={14} className="text-[#8b5cf6]" /> Active Consultation Sessions
        </h3>

        {appointments.filter(a => a.status === 'scheduled').length === 0 ? (
          <div className="bg-white border border-dash-border p-12 rounded-3xl text-center space-y-3 shadow-lg">
            <Clock size={32} className="text-dash-textMuted opacity-40 mx-auto" />
            <p className="text-xs text-dash-textMuted font-sans">No upcoming consultation meetings scheduled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {appointments.filter(a => a.status === 'scheduled').map((appt, i) => {
              const lounge = getMeetingLoungeStatus(appt.start_time);
              const cancelWindowHours = appt.calendar?.cancellation_window_hours ?? 24;

              return (
                <div 
                  key={i} 
                  className="bg-white border border-dash-border rounded-[24px] p-6 shadow-xl flex flex-col justify-between hover:border-dash-accent/30 hover:translate-y-[-1px] transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />

                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2.5 py-1 rounded-full border tracking-wider flex items-center gap-1",
                        lounge.unlock 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-dash-accent/10 text-dash-accent border-dash-accent/20"
                      )}>
                        <Clock size={10} /> {lounge.unlock ? "Room Active" : "Scheduled"}
                      </span>
                      <Calendar size={16} className="text-dash-accent opacity-60" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-dash-text line-clamp-1 font-space uppercase">
                        {appt.title}
                      </h4>
                      <p className="text-xs text-dash-textMuted font-semibold mt-1 font-sans">
                        {appt.calendar?.name || 'Standard Consultation'}
                      </p>
                      <p className="text-xs text-dash-accent font-bold mt-2 font-mono uppercase">
                        {formatLocalDate(appt.start_time)}
                      </p>
                      {appt.metadata?.notes && (
                        <p className="text-[11px] text-dash-textMuted italic mt-2.5 line-clamp-2 bg-dash-surface border border-dash-border p-2 rounded-xl">
                          Notes: {appt.metadata.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lounge Action Bar */}
                  <div className="pt-6 border-t border-dash-border mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-[10px] font-mono text-dash-textMuted uppercase tracking-wider font-semibold">
                      {lounge.label}
                    </span>

                    <div className="flex gap-2 justify-end">
                      {!appt._isGroupAttendee && (
                        <button
                          onClick={() => setReschedulingAppt(appt)}
                          disabled={isPending}
                          className="px-3.5 h-10 rounded-xl bg-dash-surface hover:bg-dash-accent/10 text-dash-text text-[9.5px] font-black uppercase tracking-wider border border-dash-border transition-colors disabled:opacity-50"
                        >
                          Reschedule
                        </button>
                      )}
                      <button
                        onClick={() => handleCancelBooking(appt)}
                        disabled={isPending}
                        className="px-3.5 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9.5px] font-black uppercase tracking-wider border border-rose-200 transition-colors disabled:opacity-50"
                        title={`Subject to ${cancelWindowHours} hour modification window`}
                      >
                        Cancel
                      </button>
                      
                      {appt.meeting_link && (
                        <a 
                          href={lounge.unlock ? appt.meeting_link : '#'}
                          onClick={(e) => {
                            if (!lounge.unlock) {
                              e.preventDefault();
                              toast.warning(`Virtual Meeting Lounge is locked. Unlocks 15 minutes prior to session.`);
                            }
                          }}
                          target={lounge.unlock ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          className={cn(
                            "inline-flex items-center gap-1.5 px-4.5 h-10 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all shadow-lg active:scale-95",
                            lounge.unlock
                              ? "bg-dash-accent hover:bg-dash-accent/90 text-white shadow-md"
                              : "bg-dash-surface text-dash-textMuted border border-dash-border cursor-not-allowed opacity-50"
                          )}
                        >
                          Join Meet <Video size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MIDDLE SECTION: BOOK A NEW CONSULTATION ── */}
      <div className="space-y-6 pt-6 border-t border-dash-border">
        <div>
          <h3 className="text-xs font-bold text-dash-textMuted uppercase tracking-[1.5px] mb-1 flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#8b5cf6]" /> Book a New Consulting Session
          </h3>
          <p className="text-[10px] text-dash-textMuted uppercase tracking-wider">
            Select a scheduling configuration to pick available time slots
          </p>
        </div>

        {/* 1. Calendars Choice List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {calendars.map((cal, i) => {
            const isSelected = selectedCalendar?.id === cal.id;
            const price = parseFloat(cal.price || '0');

            return (
              <div
                key={i}
                onClick={() => {
                  setSelectedCalendar(cal);
                  setSelectedSlot(null);
                }}
                className={cn(
                  "p-5 rounded-2xl border cursor-pointer transition-all bg-white relative overflow-hidden group shadow-md",
                  isSelected
                    ? "border-purple-400 shadow-purple-400/10"
                    : "border-dash-border hover:border-dash-accent/30"
                )}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-dash-text uppercase tracking-wide font-space group-hover:text-dash-accent">
                      {cal.name}
                    </h4>
                    {cal.slot_duration && (
                      <span className="inline-block text-[9.5px] font-mono text-dash-textMuted uppercase">
                        Duration: {cal.slot_duration} Minutes
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full font-mono border",
                    price > 0
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}>
                    {price > 0 ? `R ${price}` : 'Free'}
                  </span>
                </div>

                {cal.description && (
                  <p className="text-[10.5px] text-dash-textMuted mt-3 leading-relaxed font-sans line-clamp-2">
                    {cal.description}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-dash-border flex justify-end">
                  <span className="text-[9px] font-black uppercase tracking-wider text-dash-accent flex items-center gap-0.5">
                    Select <ChevronRight size={10} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Interactive Time Slot Picker (Mounts when Calendar Selected) */}
        {selectedCalendar && (
          <div className="bg-white border border-dash-border rounded-[24px] p-6 shadow-lg space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-start pb-4 border-b border-dash-border">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-dash-textMuted">Selected Configuration</span>
                <h4 className="text-sm font-bold text-dash-text uppercase font-space mt-0.5">
                  Available Slots for: {selectedCalendar.name}
                </h4>
              </div>
              <button
                onClick={() => {
                  setSelectedCalendar(null);
                  setSelectedSlot(null);
                }}
                className="text-dash-textMuted hover:text-dash-text"
              >
                ✕ Close
              </button>
            </div>

            {/* Date Pick Picker */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-dash-textMuted">Choose Booking Date</span>
              <div className="flex gap-2 overflow-x-auto py-1.5 scrollbar-thin">
                {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                  const d = new Date();
                  d.setDate(d.getDate() + offset);
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const isDateSelected = selectedDate === dateStr;

                  return (
                    <button
                      key={offset}
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 transition-all border",
                        isDateSelected
                          ? "bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20"
                          : "bg-dash-surface text-dash-textMuted border-dash-border hover:bg-dash-accent/5 hover:border-dash-accent/30"
                      )}
                    >
                      <span className="text-[8px] font-black uppercase">{format(d, 'EEE')}</span>
                      <span className="text-[14px] font-bold">{format(d, 'd')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot List Selection */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-dash-textMuted">Select Available Time</span>
              
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-xs text-dash-textMuted py-6 justify-center">
                  <RefreshCw className="animate-spin text-purple-500" size={16} />
                  <span>Checking slot availability...</span>
                </div>
              ) : slots.length === 0 ? (
                <div className="p-6 bg-dash-surface border border-dash-border rounded-2xl text-center text-xs text-dash-textMuted">
                  No available time slots found for {format(parseISO(selectedDate), 'MMMM d')}.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {slots.map((slot, sIdx) => {
                    const isSlotSelected = selectedSlot === slot.start;
                    const timeLabel = format(parseISO(slot.start), 'HH:mm');

                    return (
                      <button
                        key={sIdx}
                        onClick={() => setSelectedSlot(slot.start)}
                        className={cn(
                          "h-10 text-xs font-semibold rounded-xl border transition-all text-center flex items-center justify-center font-mono",
                          isSlotSelected
                            ? "bg-purple-500 text-white border-purple-500"
                            : "bg-white text-dash-text border-dash-border hover:border-dash-accent/30"
                        )}
                      >
                        {timeLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Optional notes textarea */}
            {selectedSlot && (
              <div className="space-y-4 pt-2 border-t border-dash-border animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-wider text-dash-textMuted">
                    Meeting notes & briefs (Optional)
                  </label>
                  <textarea
                    placeholder="Provide any background info, questions, or links regarding this consultation"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-dash-text focus:border-purple-400 outline-none text-xs leading-relaxed h-20 resize-none font-sans"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleCreateBooking}
                    disabled={isPending}
                    className="h-11 px-8 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-purple-500/10 active:scale-95"
                  >
                    {isPending ? "Booking..." : "Confirm & Book Session"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL OVERLAY: RESCHEDULING POPUP ── */}
      {reschedulingAppt && (
        <div className="fixed inset-0 bg-[#000000c1] backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white border border-dash-border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-dash-border flex justify-between items-center bg-dash-surface">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-dash-textMuted">Reschedule Panel</span>
                <h4 className="text-base font-bold text-dash-text font-space uppercase mt-0.5">Change Meeting Date</h4>
              </div>
              <button
                onClick={() => setReschedulingAppt(null)}
                className="text-dash-textMuted hover:text-dash-text"
              >
                ✕
              </button>
            </div>

            {/* Date Pick & Slot Pick */}
            <div className="p-6 space-y-6">
              <div className="p-4 bg-dash-surface border border-dash-border rounded-2xl flex gap-3 text-xs leading-relaxed text-dash-textMuted">
                <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Rescheduling constraints:</strong> Changing dates is subject to the calendar's <strong>{reschedulingAppt.calendar?.cancellation_window_hours ?? 24} hour</strong> lockout window rules.
                </span>
              </div>

              {/* Date selection navigation */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-dash-textMuted">Select Reschedule Date</span>
                <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
                  {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                    const d = new Date();
                    d.setDate(d.getDate() + offset);
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const isDateSelected = rescheduleDate === dateStr;

                    return (
                      <button
                        key={offset}
                        onClick={() => setRescheduleDate(dateStr)}
                        className={cn(
                          "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 transition-all border",
                          isDateSelected
                            ? "bg-purple-500 text-white border-purple-500"
                            : "bg-dash-surface text-dash-textMuted border-dash-border hover:bg-dash-accent/5"
                        )}
                      >
                        <span className="text-[8px] font-black uppercase">{format(d, 'EEE')}</span>
                        <span className="text-[14px] font-bold">{format(d, 'd')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slots selection */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-dash-textMuted">Select New Time Slot</span>

                {loadingRescheduleSlots ? (
                  <div className="flex items-center gap-2 text-xs text-dash-textMuted py-4 justify-center">
                    <RefreshCw className="animate-spin text-purple-500" size={14} />
                    <span>Querying slot matrix...</span>
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="p-4 bg-dash-surface border border-dash-border rounded-xl text-center text-xs text-dash-textMuted">
                    No available time slots found.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {rescheduleSlots.map((slot, sIdx) => {
                      const isSelected = selectedRescheduleSlot === slot.start;
                      const timeLabel = format(parseISO(slot.start), 'HH:mm');

                      return (
                        <button
                          key={sIdx}
                          onClick={() => setSelectedRescheduleSlot(slot.start)}
                          className={cn(
                            "h-9 text-xs font-semibold rounded-xl border transition-all text-center flex items-center justify-center font-mono",
                            isSelected
                              ? "bg-purple-500 text-white border-purple-500"
                              : "bg-dash-surface text-dash-text border-dash-border hover:border-dash-accent/30"
                          )}
                        >
                          {timeLabel}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-dash-surface border-t border-dash-border flex justify-end gap-3">
              <button
                onClick={() => setReschedulingAppt(null)}
                className="h-11 px-5 rounded-xl bg-white border border-dash-border hover:bg-dash-border/40 text-dash-text text-[10px] font-black uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleBooking}
                disabled={!selectedRescheduleSlot || isPending}
                className="h-11 px-8 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5 active:scale-95"
              >
                {isPending ? "Updating..." : "Save Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
