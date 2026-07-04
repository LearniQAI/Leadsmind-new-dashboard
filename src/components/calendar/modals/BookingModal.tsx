'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, User, Check, ChevronsUpDown, Loader2, Video, Link as LinkIcon, Sparkles } from 'lucide-react';
import { format, addMinutes, parseISO } from 'date-fns';
import { searchContacts } from '@/app/actions/contacts';
import { createAppointment, updateAppointment } from '@/app/actions/calendar/appointments';
import { toast } from 'sonner';

const bookingSchema = z.object({
  calendarId: z.string().min(1, 'Please select a calendar'),
  contactId: z.string().optional(),
  title: z.string().min(3, 'Title is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  meetingMode: z.enum(['google_meet', 'zoom', 'phone', 'in_person', 'custom_link', 'client_choice', 'internal_meet']),
});

interface BookingFormValues {
  calendarId: string;
  contactId?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingMode: 'google_meet' | 'zoom' | 'phone' | 'in_person' | 'custom_link' | 'client_choice' | 'internal_meet';
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: any[];
  initialDate?: Date;
  initialAppointment?: any;
  allAppointments?: any[];
  onViewAppointment?: (apt: any) => void;
}

export default function BookingModal({ 
  isOpen, 
  onClose, 
  calendars, 
  initialDate,
  initialAppointment,
  allAppointments = [],
  onViewAppointment
}: BookingModalProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [view, setView] = useState<'agenda' | 'form'>('form');

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema) as any,
    defaultValues: {
      calendarId: '',
      contactId: '',
      title: '',
      date: initialDate ? format(initialDate, 'yyyy-MM-dd') : '',
      startTime: initialDate ? format(initialDate, 'HH:mm') : '',
      endTime: initialDate ? format(addMinutes(initialDate, 30), 'HH:mm') : '',
      meetingMode: 'internal_meet',
    },
  });

  // 2. Sync form when props change
  useEffect(() => {
    if (isOpen) {
      if (initialAppointment) {
        setView('form');
        form.reset({
          calendarId: initialAppointment.calendar_id,
          contactId: initialAppointment.contact_id || '',
          title: initialAppointment.title,
          date: format(parseISO(initialAppointment.start_time), 'yyyy-MM-dd'),
          startTime: format(parseISO(initialAppointment.start_time), 'HH:mm'),
          endTime: format(parseISO(initialAppointment.end_time), 'HH:mm'),
          meetingMode: initialAppointment.meeting_mode || 'internal_meet',
        });
      } else if (initialDate) {
        const dateStr = format(initialDate, 'yyyy-MM-dd');
        const dayEvents = allAppointments.filter(apt => 
          format(parseISO(apt.start_time), 'yyyy-MM-dd') === dateStr
        );

        if (dayEvents.length > 0) {
          setView('agenda');
        } else {
          setView('form');
        }

        form.reset({
          calendarId: calendars[0]?.id || '',
          contactId: '',
          title: '',
          date: dateStr,
          startTime: format(initialDate, 'HH:mm'),
          endTime: format(addMinutes(initialDate, 30), 'HH:mm'),
          meetingMode: calendars[0]?.meeting_mode || 'internal_meet',
        });
      }
    }
  }, [isOpen, initialAppointment, initialDate, form, calendars, allAppointments]);

  // Sync default meeting mode when calendar changes
  const watchedCalendarId = form.watch('calendarId');
  useEffect(() => {
    const selectedCal = calendars.find(c => c.id === watchedCalendarId);
    if (selectedCal && !initialAppointment) {
      form.setValue('meetingMode', selectedCal.meeting_mode || 'internal_meet');
    }
  }, [watchedCalendarId, calendars, initialAppointment, form]);

  const handleSearchContacts = async (query: string) => {
    if (query.length < 1) {
       setContacts([]);
       return;
    }
    setIsSearching(true);
    const res = await searchContacts(query);
    if (res.success) {
      setContacts(res.data);
    }
    setIsSearching(false);
  };

  const selectContact = (contact: any) => {
    form.setValue('contactId', contact.id);
    setSelectedContact(contact);
    setContacts([]);
  };

  const clearContact = () => {
    form.setValue('contactId', '');
    setSelectedContact(null);
    setContacts([]);
  };

  const onSubmit = async (values: BookingFormValues) => {
    setIsSubmitting(true);
    const start = new Date(`${values.date}T${values.startTime}`);
    const end = new Date(`${values.date}T${values.endTime}`);

    let res;
    if (initialAppointment) {
      res = await updateAppointment(initialAppointment.id, {
        title: values.title,
        calendar_id: values.calendarId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        meeting_mode: values.meetingMode,
      });
    } else {
      res = await createAppointment({
        calendarId: values.calendarId,
        contactId: values.contactId,
        title: values.title,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        meetingMode: values.meetingMode,
      });
    }

    if (res.success) {
      toast.success(initialAppointment ? 'Appointment updated' : 'Appointment booked successfully!');
      onClose();
    } else {
      toast.error(res.error || 'Failed to save appointment');
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] z-[1002] bg-[var(--n800)] border-[var(--bdr)] text-[var(--t1)]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold font-['Space_Grotesk'] uppercase tracking-wider text-[var(--accent2)] flex items-center justify-between">
            {view === 'agenda' ? (
              <span>Daily <span className="text-[var(--t1)]">Agenda</span></span>
            ) : (
              <span>{initialAppointment ? 'Edit' : 'Book'} <span className="text-[var(--t1)]">Appointment</span></span>
            )}
            {initialDate && (
              <span className="text-[12px] font-medium text-[var(--t4)] normal-case tracking-normal">
                {format(initialDate, 'MMM do, yyyy')}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {view === 'agenda' ? (
          <div className="py-6 space-y-6">
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {allAppointments
                .filter(apt => format(parseISO(apt.start_time), 'yyyy-MM-dd') === form.getValues('date'))
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                .map(apt => (
                  <div 
                    key={apt.id}
                    onClick={() => onViewAppointment?.(apt)}
                    className="group p-4 bg-[var(--n900)] border border-[var(--bdr)] rounded-[var(--r12)] hover:border-[var(--accent)] transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--accent)] bg-opacity-10 flex items-center justify-center text-[var(--accent2)]">
                        <Clock size={18} />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[var(--t1)] group-hover:text-[var(--accent2)] transition-colors">{apt.title}</p>
                        <p className="text-[11px] text-[var(--t4)] flex items-center gap-1.5 mt-0.5 uppercase font-black tracking-widest">
                          {format(parseISO(apt.start_time), 'h:mm a')} - {format(parseISO(apt.end_time), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="px-2 py-1 rounded bg-[rgba(255,255,255,0.03)] border border-[var(--bdr)] text-[9px] font-black uppercase text-[var(--t4)]">
                         {apt.calendar?.name || 'Meeting'}
                       </div>
                    </div>
                  </div>
                ))}
            </div>

            <Button 
              onClick={() => setView('form')}
              className="w-full bg-[var(--accent)]/10 hover:bg-[var(--accent)] text-[var(--accent2)] hover:text-white border border-[var(--accent)] border-opacity-20 h-12 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all"
            >
              <Sparkles size={16} className="mr-2" /> Add New Session
            </Button>
          </div>
        ) : (
          <>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[500px] overflow-y-auto px-1">
                {/* Form Content */}
            {/* Calendar Selection */}
            <FormField
              control={form.control}
              name="calendarId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-black uppercase tracking-widest text-[var(--t3)]">Calendar Engine</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[var(--n900)] border-[var(--bdr)] text-[var(--t2)] h-11">
                        <SelectValue placeholder="Select a calendar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[var(--n900)] border-[var(--bdr)] z-[1100]">
                      {calendars.map(cal => (
                        <SelectItem key={cal.id} value={cal.id} className="text-[var(--t2)] focus:bg-[var(--accent)] focus:text-white">
                          {cal.name} ({cal.calendar_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-400 text-[10px]" />
                </FormItem>
              )}
            />

            {/* Meeting Mode Override */}
            <FormField
              control={form.control}
              name="meetingMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-black uppercase tracking-widest text-[var(--t3)]">Meeting Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[var(--n900)] border-[var(--bdr)] text-[var(--t2)] h-11">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[var(--n900)] border-[var(--bdr)] z-[1100]">
                      <SelectItem value="internal_meet" className="focus:bg-[var(--accent)]">
                        <div className="flex items-center gap-2">
                           <Sparkles size={14} className="text-[var(--accent2)]" /> LeadsMind Video (Internal)
                        </div>
                      </SelectItem>
                      <SelectItem value="google_meet">
                        <div className="flex items-center gap-2">
                           <Video size={14} className="text-blue-400" /> Google Meet
                        </div>
                      </SelectItem>
                      <SelectItem value="zoom">
                        <div className="flex items-center gap-2">
                           <Video size={14} className="text-blue-500" /> Zoom
                        </div>
                      </SelectItem>
                      <SelectItem value="custom_link">
                        <div className="flex items-center gap-2">
                           <LinkIcon size={14} className="text-[var(--t4)]" /> Custom Link / Address
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-black uppercase tracking-widest text-[var(--t3)]">Meeting Title</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-[var(--n900)] border-[var(--bdr)] text-[var(--t1)] h-11" placeholder="e.g. Discovery Call" />
                  </FormControl>
                  <FormMessage className="text-red-400 text-[10px]" />
                </FormItem>
              )}
            />

            {/* Contact Search */}
            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-black uppercase tracking-widest text-[var(--t3)]">Contact / Client</FormLabel>
                  <div className="relative">
                    {selectedContact ? (
                      <div className="flex items-center justify-between bg-[var(--n900)] border border-[var(--accent)] rounded-[var(--r8)] h-11 px-4 text-[13px] text-[var(--t1)]">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold">
                              {selectedContact.first_name[0]}{selectedContact.last_name[0]}
                           </div>
                           <span className="font-bold">{selectedContact.first_name} {selectedContact.last_name}</span>
                           <span className="text-[var(--t4)] text-[11px]">({selectedContact.email})</span>
                        </div>
                        <button 
                          type="button"
                          onClick={clearContact}
                          className="text-[var(--t4)] hover:text-red-400 transition-colors text-[10px] font-black uppercase"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <>
                        <Input
                          className="bg-[var(--n900)] border-[var(--bdr)] text-[var(--t1)] h-11 pl-10"
                          placeholder="Search by name or email..."
                          autoComplete="off"
                          onChange={(e) => handleSearchContacts(e.target.value)}
                        />
                        <User size={16} className="absolute left-3 top-3 text-[var(--t4)]" />
                        {isSearching && <Loader2 className="absolute right-3 top-3 animate-spin text-[var(--accent)]" size={16} />}
                      </>
                    )}
                  </div>
                  {!selectedContact && contacts.length > 0 && (
                    <div className="mt-2 bg-[var(--n900)] border border-[var(--bdr)] rounded-[var(--r8)] overflow-hidden max-h-[150px] overflow-y-auto shadow-2xl z-50">
                      {contacts.map(c => (
                        <div
                          key={c.id}
                          className="p-3 text-[12px] cursor-pointer hover:bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.05)] last:border-0 transition-colors flex flex-col gap-0.5"
                          onClick={() => selectContact(c)}
                        >
                          <span className="font-bold text-[var(--t1)]">{c.first_name} {c.last_name}</span>
                          <span className="text-[var(--t4)] text-[11px]">{c.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <FormMessage className="text-red-400 text-[10px]" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase tracking-widest text-[var(--t3)]">Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-[var(--n900)] border-[var(--bdr)] text-[var(--t1)] h-11 px-2" />
                    </FormControl>
                    <FormMessage className="text-red-400 text-[10px]" />
                  </FormItem>
                )}
              />

              {/* Start Time */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase tracking-widest text-[var(--t3)]">Start</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="bg-[var(--n900)] border-[var(--bdr)] text-[var(--t1)] h-11 px-2" />
                    </FormControl>
                    <FormMessage className="text-red-400 text-[10px]" />
                  </FormItem>
                )}
              />

              {/* End Time */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase tracking-widest text-[var(--t3)]">End</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="bg-[var(--n900)] border-[var(--bdr)] text-[var(--t1)] h-11 px-2" />
                    </FormControl>
                    <FormMessage className="text-red-400 text-[10px]" />
                  </FormItem>
                )}
              />
            </div>
              </form>
            </Form>

            <DialogFooter className="border-t border-[var(--bdr)] pt-4 mt-2">
              <Button variant="ghost" onClick={() => setView('agenda')} className="flex-1 text-[var(--t3)] hover:text-[var(--t1)] font-bold uppercase tracking-widest text-[11px]">
                Back to Agenda
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="bg-[var(--accent)] hover:bg-[var(--accent2)] text-white font-bold uppercase tracking-widest text-[11px] px-8 h-11 rounded-[var(--r8)] transition-all"
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Check className="mr-2" size={16} />}
                Confirm Booking
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
