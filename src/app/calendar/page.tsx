import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from "@/components/layouts/DefaultWrapper";
import CalendarClient from '@/components/calendar/CalendarClient';

export default async function CalendarPage() {
    await requireAuth();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return null;

    const supabase = await createServerClient();

    // 1. Fetch High-Fidelity Data Matrix (Strict Tenant Isolation)
    const { data: calendars } = await supabase
        .from('booking_calendars')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

    const { data: appointments } = await supabase
        .from('appointments')
        .select('*, contact:contacts(first_name, last_name, email)')
        .eq('workspace_id', workspaceId)
        .order('start_time', { ascending: false });

    return (
        <Wrapper>
            <main className="min-h-screen bg-dash-surface !text-dash-text">
                <CalendarClient 
                    initialAppointments={appointments || []} 
                    initialCalendars={calendars || []}
                    workspaceId={workspaceId}
                />
            </main>
        </Wrapper>
    );
}
