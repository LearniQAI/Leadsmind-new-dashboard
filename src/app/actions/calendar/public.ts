'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getAvailableSlots } from './scheduling';
import { addMinutes, parseISO } from 'date-fns';

/**
 * Public action to book an appointment
 */
export async function bookAppointment(calendarId: string, slot: string, leadData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    notes?: string;
}) {
    const supabase = createAdminClient();

    // 1. Fetch Calendar Metadata (Internal)
    const { data: calendar, error: calError } = await supabase
        .from('booking_calendars')
        .select('workspace_id, slot_duration, meeting_mode, custom_link')
        .eq('id', calendarId)
        .single();

    if (calError || !calendar) return { success: false, error: 'Calendar configuration not found' };

    // 2. Validate Slot is still available
    const date = slot.split('T')[0];
    const available = await getAvailableSlots(calendarId, date);
    const isStillAvailable = available.some(s => s.start === slot);
    
    if (!isStillAvailable) return { success: false, error: 'This slot was just taken. Please select another time.' };

    // 3. Create or Update Contact
    const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .upsert({
            workspace_id: calendar.workspace_id,
            email: leadData.email,
            first_name: leadData.firstName,
            last_name: leadData.lastName,
            phone: leadData.phone
        }, { onConflict: 'workspace_id,email' })
        .select()
        .single();

    if (contactError) return { success: false, error: 'Failed to synchronize contact details' };

    // 4. Create Appointment
    const startTime = parseISO(slot);
    const endTime = addMinutes(startTime, calendar.slot_duration || 30);

    const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .insert({
            workspace_id: calendar.workspace_id,
            calendar_id: calendarId,
            contact_id: contact.id,
            title: `Meeting with ${leadData.firstName} ${leadData.lastName}`,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'scheduled',
            metadata: {
                notes: leadData.notes,
                meeting_mode: calendar.meeting_mode,
                booked_publicly: true
            }
        })
        .select()
        .single();

    if (aptError) return { success: false, error: 'Failed to record appointment' };

    // 5. Generate Meeting Link if Internal
    if (calendar.meeting_mode === 'internal_meet' || (calendar.meeting_mode === 'custom_link' && !calendar.custom_link)) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const internalLink = `${baseUrl}/meet/${appointment.id}`;
        
        await supabase
            .from('appointments')
            .update({ meeting_link: internalLink, meeting_mode: 'internal_meet' })
            .eq('id', appointment.id);
    } else if (calendar.custom_link) {
        await supabase
            .from('appointments')
            .update({ meeting_link: calendar.custom_link })
            .eq('id', appointment.id);
    }

    return { success: true, appointmentId: appointment.id };
}

/**
 * Public action to fetch slots for a specific date
 */
export async function fetchPublicSlots(calendarId: string, date: string) {
    return await getAvailableSlots(calendarId, date);
}
