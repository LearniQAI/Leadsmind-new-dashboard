'use client';

import React, { useState } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, Pencil, Trash2,
  MoreVertical, CheckCircle, XCircle, AlertCircle, User, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek
} from 'date-fns';
import { toast } from 'sonner';
import { createBooking, updateAppointmentStatus } from '@/app/actions/calendar';

const APT_STATUSES = ['scheduled', 'confirmed', 'showed_up', 'no_show', 'cancelled'];

const statusConfig: Record<string, { color: string; label: string }> = {
  scheduled: { color: 'bg-blue-100 text-blue-700', label: 'Scheduled' },
  confirmed: { color: 'bg-emerald-100 text-emerald-700', label: 'Confirmed' },
  showed_up: { color: 'bg-violet-100 text-violet-700', label: 'Showed Up' },
  no_show: { color: 'bg-rose-100 text-rose-700', label: 'No Show' },
  cancelled: { color: 'bg-gray-100 text-gray-500', label: 'Cancelled' },
};

interface CalendarClientProps {
  appointments: any[];
  calendars: any[];
}

export function CalendarClient({ appointments: initialAppointments, calendars }: CalendarClientProps) {
  const [appointments, setAppointments] = useState<any[]>(initialAppointments);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Selected day / event
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedApt, setSelectedApt] = useState<any>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', start_time: '', end_time: '', calendar_id: calendars[0]?.id || '', contact_id: ''
  });
  const [creating, setCreating] = useState(false);

  // Edit/View dialog
  const [viewOpen, setViewOpen] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getAptColor = (status: string) => {
    if (status === 'confirmed' || status === 'showed_up') return 'bg-emerald-100 border-emerald-200 text-emerald-700';
    if (status === 'cancelled' || status === 'no_show') return 'bg-rose-50 border-rose-100 text-rose-600 opacity-60';
    return 'bg-primary/5 border-primary/20 text-primary';
  };

  const handleCreateOpen = (day?: Date) => {
    const base = day || new Date();
    const dateStr = format(base, "yyyy-MM-dd'T'HH:mm");
    setCreateForm({
      title: '',
      start_time: dateStr,
      end_time: format(new Date(base.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
      calendar_id: calendars[0]?.id || '',
      contact_id: ''
    });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.title || !createForm.start_time || !createForm.end_time) {
      toast.error('Title, start and end time are required'); return;
    }
    if (!createForm.calendar_id) {
      toast.error('No calendar available — create a calendar first'); return;
    }
    setCreating(true);
    try {
      const { createBooking } = await import('@/app/actions/calendar');
      const res = await createBooking({
        calendarId: createForm.calendar_id,
        contactId: createForm.contact_id || '00000000-0000-0000-0000-000000000000',
        title: createForm.title,
        startTime: new Date(createForm.start_time).toISOString(),
        endTime: new Date(createForm.end_time).toISOString(),
      });
      if (!res.success) { toast.error(res.error || 'Failed to create event'); }
      else {
        toast.success('Event created!');
        setAppointments(prev => [...prev, res.data!]);
        setCreateOpen(false);
      }
    } catch (e: any) { toast.error(e.message || 'Error'); }
    setCreating(false);
  };

  const handleStatusChange = async (apt: any, status: string) => {
    const res = await updateAppointmentStatus(apt.id, status);
    if (!res.success) { toast.error(res.error || 'Update failed'); return; }
    setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status } : a));
    setSelectedApt((prev: any) => prev ? { ...prev, status } : prev);
    toast.success(`Appointment marked as ${statusConfig[status]?.label || status}`);
  };

  const handleDelete = async () => {
    if (!selectedApt) return;
    setDeleting(true);
    try {
      const { deleteAppointment } = await import('@/app/actions/pipelines');
      const res = await deleteAppointment(selectedApt.id);
      if (!res.success) { toast.error(res.error || 'Delete failed'); }
      else {
        toast.success('Appointment deleted');
        setAppointments(prev => prev.filter(a => a.id !== selectedApt.id));
        setDeleteOpen(false);
        setViewOpen(false);
      }
    } catch { toast.error('Delete failed'); }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card__wrapper shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                {format(currentDate, 'MMMM')} <span className="text-primary">{format(currentDate, 'yyyy')}</span>
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                {appointments.length} appointments scheduled
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="rounded-none hover:bg-gray-50 h-10 w-10">
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </Button>
              <button onClick={() => setCurrentDate(new Date())} className="h-10 px-4 flex items-center justify-center font-bold text-xs uppercase text-gray-500 border-x border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                Today
              </button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="rounded-none hover:bg-gray-50 h-10 w-10">
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
            <Button onClick={() => handleCreateOpen()} className="btn-primary h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" /> New Event
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              const dayApts = appointments.filter(apt =>
                apt.start_time && isSameDay(new Date(apt.start_time), day)
              );
              return (
                <div
                  key={i}
                  onClick={() => { setSelectedDay(day); handleCreateOpen(day); }}
                  className={`min-h-[100px] p-2 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col gap-1 hover:shadow-md
                    ${!isCurrentMonth ? 'bg-gray-50/50 border-gray-100 opacity-40' : 'bg-white border-gray-150 hover:border-primary/30'}
                    ${isToday ? 'ring-2 ring-primary/40 border-primary/50 bg-primary/5' : ''}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-bold ${isToday ? 'text-primary bg-primary/10 px-2 py-0.5 rounded-md' : 'text-gray-500'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayApts.length > 0 && (
                      <Badge className="bg-primary/10 text-primary border-none text-[9px] px-1.5 h-4">
                        {dayApts.length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {dayApts.slice(0, 2).map((apt, idx) => (
                      <div
                        key={idx}
                        onClick={e => { e.stopPropagation(); setSelectedApt(apt); setViewOpen(true); }}
                        className={`px-2 py-1 rounded-md text-[10px] border cursor-pointer hover:shadow-sm transition-all ${getAptColor(apt.status)}`}
                      >
                        <div className="font-bold truncate">
                          {apt.title || `${apt.contact?.first_name || 'Meeting'} ${apt.contact?.last_name || ''}`}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 opacity-70">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{format(new Date(apt.start_time), 'h:mm a')}</span>
                        </div>
                      </div>
                    ))}
                    {dayApts.length > 2 && (
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedDay(day); }}
                        className="text-[9px] font-black text-gray-400 hover:text-primary transition-colors text-center mt-0.5"
                      >
                        +{dayApts.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-lg p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">
              New <span className="text-primary">Event</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Event Title *</Label>
              <Input value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Strategy Call with Client" className="h-12 border-gray-200 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Start *</Label>
                <Input type="datetime-local" value={createForm.start_time} onChange={e => setCreateForm(p => ({ ...p, start_time: e.target.value }))} className="h-12 border-gray-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">End *</Label>
                <Input type="datetime-local" value={createForm.end_time} onChange={e => setCreateForm(p => ({ ...p, end_time: e.target.value }))} className="h-12 border-gray-200 rounded-xl" />
              </div>
            </div>
            {calendars.length > 1 && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Calendar</Label>
                <Select value={createForm.calendar_id} onValueChange={v => setCreateForm(p => ({ ...p, calendar_id: v }))}>
                  <SelectTrigger className="h-12 border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-xl">
                    {calendars.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="btn-primary rounded-xl font-black uppercase text-xs px-8">
              {creating ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View / Edit Appointment Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-md p-8 shadow-2xl">
          {selectedApt && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800 leading-tight pr-4">
                    {selectedApt.title || `${selectedApt.contact?.first_name || 'Meeting'} ${selectedApt.contact?.last_name || ''}`}
                  </DialogTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <MoreVertical size={14} className="text-gray-600" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl min-w-[170px]">
                      {APT_STATUSES.filter(s => s !== selectedApt.status).map(s => (
                        <DropdownMenuItem key={s} onClick={() => handleStatusChange(selectedApt, s)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 rounded-lg mx-1 px-3 py-2">
                          <span className={`w-2 h-2 rounded-full ${statusConfig[s]?.color.split(' ')[0]}`} />
                          {statusConfig[s]?.label || s}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="my-1 bg-gray-100" />
                      <DropdownMenuItem onClick={() => { setDeleteOpen(true); }} className="flex items-center gap-2 cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg mx-1 px-3 py-2">
                        <Trash2 size={14} /> Delete Event
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Badge className={`${statusConfig[selectedApt.status]?.color || 'bg-gray-100 text-gray-500'} border-none text-[9px] font-black uppercase`}>
                  {statusConfig[selectedApt.status]?.label || selectedApt.status}
                </Badge>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                  {selectedApt.contact && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs">
                        {selectedApt.contact.first_name?.[0] || 'C'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{selectedApt.contact.first_name} {selectedApt.contact.last_name}</p>
                        <p className="text-xs text-gray-400">{selectedApt.contact.email}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-bold">{format(new Date(selectedApt.start_time), 'MMM d, yyyy • h:mm a')}</span>
                    {selectedApt.end_time && <span className="text-gray-400">→ {format(new Date(selectedApt.end_time), 'h:mm a')}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {APT_STATUSES.filter(s => s !== selectedApt.status).slice(0, 4).map(s => (
                    <Button key={s} size="sm" onClick={() => handleStatusChange(selectedApt, s)} className={`rounded-xl text-[9px] font-black uppercase h-9 ${statusConfig[s]?.color} border border-transparent hover:opacity-80 transition-opacity`}>
                      {statusConfig[s]?.label}
                    </Button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-sm p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">Delete Event?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500 text-sm py-4">This will permanently remove <strong className="text-gray-800">{selectedApt?.title || 'this event'}</strong> from your calendar.</p>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8">{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
