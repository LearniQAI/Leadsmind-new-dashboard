import React from 'react';
import CalendarClient from './CalendarClient';
import { getAppointments } from '@/app/actions/calendar';

export default async function CalendarPage() {
  const { data: appointments, error } = await getAppointments();

  return (
    <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-100px)]">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Smart <span className="text-primary">Calendar</span></h1>
        <p className="text-white/40 text-sm font-medium">Manage appointments and waitlists seamlessly.</p>
      </div>

      {error ? (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger">
          {error}
        </div>
      ) : (
        <CalendarClient initialAppointments={appointments || []} />
      )}
    </div>
  );
}
