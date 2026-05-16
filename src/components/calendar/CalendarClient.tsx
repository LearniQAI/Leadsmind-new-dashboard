'use client';

import React, { useState } from 'react';
import CalendarHeader from './CalendarHeader';
import CalendarToolbar, { CalendarView } from './CalendarToolbar';
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
import { 
  getAppointments, 
  createAppointment, 
  updateAppointment, 
  deleteAppointment 
} from '@/app/actions/calendar/appointments';
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
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

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
    setAppointmentToDelete(id);
    setIsConfirmOpen(true);
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
    setSelectedAppointment(appointment);
    setIsEditing(true);
    setIsDetailsModalOpen(false);
    setIsBookingModalOpen(true);
  };

  const hasCalendars = initialCalendars.length > 0;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      {/* 1. Header Section */}
      <CalendarHeader onNewAppointment={() => setIsBookingModalOpen(true)} />

      {/* 2. Stats Section (Only if calendars exist) */}
      {hasCalendars && <CalendarStats appointments={initialAppointments} />}

      {/* 3. Toolbar Section */}
      <CalendarToolbar 
        activeView={activeView} 
        onViewChange={setActiveView} 
      />

      {/* 4. Main Content Area */}
      <div className="min-h-[400px]">
        {!hasCalendars ? (
          <CalendarEmptyState />
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
               <CalendarPagesView calendars={initialCalendars} />
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
