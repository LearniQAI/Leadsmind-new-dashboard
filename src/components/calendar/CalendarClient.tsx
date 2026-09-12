'use client';

import React, { useState } from 'react';
import CalendarHeader from './CalendarHeader';
import CalendarToolbar, { CalendarView, CalendarTypeFilter } from './CalendarToolbar';
import CalendarStats from './CalendarStats';
import CalendarEmptyState from './CalendarEmptyState';
import CalendarMonthView from './views/CalendarMonthView';
import CalendarWeekView from './views/CalendarWeekView';
import CalendarDayView from './views/CalendarDayView';
import CalendarListView from './views/CalendarListView';
import CalendarPagesView from './views/CalendarPagesView';
import BookingModal from './modals/BookingModal';
import AppointmentDetailsModal from './modals/AppointmentDetailsModal';
import ConfirmationModal from './modals/ConfirmationModal';
import CalendarSettingsModal from './modals/CalendarSettingsModal';
import RecurrenceScopeModal, { type RecurrenceScope } from './modals/RecurrenceScopeModal';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
} from '@/app/actions/calendar/appointments';
import { updateRecurringScope } from '@/app/actions/calendar/recurringMeetings';
import { createCalendar } from '@/app/actions/calendar/calendars';
import { toast } from 'sonner';

interface CalendarClientProps {
  initialAppointments: any[];
  initialCalendars: any[];
  workspaceId: string;
}

export default function CalendarClient({ 
  initialAppointments, 
  initialCalendars,
  workspaceId 
}: CalendarClientProps) {
  const [activeView, setActiveView] = useState<CalendarView>('month');
  const [activeFilter, setActiveFilter] = useState<CalendarTypeFilter>('all');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [isCreateCalendarOpen, setIsCreateCalendarOpen] = useState(false);
  // Task 69 — recurring-series scope prompt
  const [scopePrompt, setScopePrompt] = useState<{ apt: any; action: 'cancel' | 'reschedule' } | null>(null);
  const [scopeBusy, setScopeBusy] = useState(false);
  const [seriesRescheduleScope, setSeriesRescheduleScope] = useState<RecurrenceScope | null>(null);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsEditing(false);
    setIsBookingModalOpen(true);
  };

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  const handleCancelAppointment = (id: string) => {
    const apt = initialAppointments.find((a) => a.id === id);
    if (apt?.series_id) {
      setScopePrompt({ apt, action: 'cancel' });
      setIsDetailsModalOpen(false);
      return;
    }
    setAppointmentToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleScopeConfirm = async (scope: RecurrenceScope) => {
    if (!scopePrompt) return;
    if (scopePrompt.action === 'reschedule') {
      // Hand off to BookingModal to collect the new time; the actual call
      // happens in onSeriesReschedule below.
      setSeriesRescheduleScope(scope);
      setSelectedAppointment(scopePrompt.apt);
      setIsEditing(true);
      setScopePrompt(null);
      setIsBookingModalOpen(true);
      return;
    }
    setScopeBusy(true);
    try {
      const res = await updateRecurringScope({ appointmentId: scopePrompt.apt.id, scope, action: 'cancel' });
      if (res.success) {
        toast.success(`Cancelled (${res.data.affected} occurrence${res.data.affected === 1 ? '' : 's'})`);
        setScopePrompt(null);
      } else {
        toast.error(res.error || 'Failed to cancel');
      }
    } finally {
      setScopeBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteAppointment(appointmentToDelete);
      if (res.success) {
        toast.success('Appointment cancelled');
        setIsConfirmOpen(false);
        setIsDetailsModalOpen(false);
        setAppointmentToDelete(null);
      } else {
        toast.error('Failed to cancel appointment');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditAppointment = (appointment: any) => {
    if (appointment?.series_id) {
      // Recurring occurrence — ask scope first, then collect the new time.
      setScopePrompt({ apt: appointment, action: 'reschedule' });
      setIsDetailsModalOpen(false);
      return;
    }
    setSelectedAppointment(appointment);
    setIsEditing(true);
    setIsDetailsModalOpen(false);
    setIsBookingModalOpen(true);
  };

  const handleSeriesReschedule = async (newStartISO: string) => {
    if (!selectedAppointment || !seriesRescheduleScope) {
      return { success: false, error: 'Missing recurrence scope' };
    }
    const res = await updateRecurringScope({
      appointmentId: selectedAppointment.id,
      scope: seriesRescheduleScope,
      action: 'reschedule',
      newStartTime: newStartISO,
    });
    setSeriesRescheduleScope(null);
    return res.success
      ? { success: true }
      : { success: false, error: res.error };
  };

  const handleCreateCalendar = async (data: any) => {
    const res = await createCalendar(data);
    if (res.success) {
      toast.success('Calendar created successfully');
    } else {
      toast.error(res.error || 'Failed to create calendar');
    }
  };

  const hasCalendars = initialCalendars.length > 0;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      {/* 1. Header Section */}
      <CalendarHeader
        onNewAppointment={() => setIsBookingModalOpen(true)}
        calendars={initialCalendars}
        onViewPublicPages={() => setActiveView('pages')}
      />

      {/* 2. Stats Section (Only if calendars exist) */}
      {hasCalendars && <CalendarStats appointments={initialAppointments} />}

      {/* 3. Toolbar Section */}
      <CalendarToolbar
        activeView={activeView}
        onViewChange={setActiveView}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* 4. Main Content Area */}
      <div className="min-h-[400px]">
        {!hasCalendars ? (
          <CalendarEmptyState onCreateClick={() => setIsCreateCalendarOpen(true)} />
        ) : (
          <div className="space-y-6">
            {/* View Orchestration */}
            {activeView === 'month' && (
               <CalendarMonthView 
                 appointments={initialAppointments} 
                 onDayClick={handleDayClick}
                 onAppointmentClick={handleAppointmentClick}
               />
            )}
            {activeView === 'week' && (
               <CalendarWeekView appointments={initialAppointments} />
            )}
            {activeView === 'day' && (
               <CalendarDayView appointments={initialAppointments} />
            )}
            {activeView === 'list' && (
               <CalendarListView appointments={initialAppointments} />
            )}
            {activeView === 'pages' && (
               <CalendarPagesView
                 calendars={activeFilter === 'all' ? initialCalendars : initialCalendars.filter(c => c.calendar_type === activeFilter)}
               />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedDate(undefined);
          setSelectedAppointment(null);
          setIsEditing(false);
        }} 
        calendars={initialCalendars}
        initialDate={selectedDate}
        initialAppointment={isEditing ? selectedAppointment : null}
        allAppointments={initialAppointments}
        onViewAppointment={(apt) => {
          setIsBookingModalOpen(false);
          handleAppointmentClick(apt);
        }}
        onSeriesReschedule={seriesRescheduleScope ? handleSeriesReschedule : undefined}
      />

      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onCancel={handleCancelAppointment}
        onEdit={handleEditAppointment}
        onReschedule={handleEditAppointment}
      />

      <CalendarSettingsModal
        isOpen={isCreateCalendarOpen}
        onClose={() => setIsCreateCalendarOpen(false)}
        calendar={null}
        onSave={handleCreateCalendar}
      />

      <RecurrenceScopeModal
        isOpen={!!scopePrompt}
        onClose={() => setScopePrompt(null)}
        action={scopePrompt?.action ?? 'cancel'}
        onConfirm={handleScopeConfirm}
        isLoading={scopeBusy}
      />

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment? This action cannot be undone and the client will be notified."
        confirmText="Yes, Cancel"
        isDestructive={true}
      />
    </div>
  );
}
