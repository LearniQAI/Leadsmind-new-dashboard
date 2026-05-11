import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getBookingAnalytics, getCalendarOutcomes, getIntakeForm } from '@/app/actions/calendar';
import { BookingIntelligenceDashboard } from '@/components/dashboard/BookingIntelligenceDashboard';
import { AppointmentsList } from '@/components/calendar/AppointmentsList';
import { CalendarList } from '@/components/calendar/CalendarList';
import { OutcomeManager } from '@/components/calendar/OutcomeManager';
import { IntakeFormBuilder } from '@/components/calendar/IntakeFormBuilder';
import { CreditPackageEditor } from '@/components/calendar/CreditPackageEditor';
import { CalendarDays, Info, LayoutTemplate, Users, BarChart3, Rocket, CreditCard, ArrowRight, Zap, Activity, Target } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import Wrapper from "@/components/layouts/DefaultWrapper";
import { PremiumSection } from '@/components/calendar/BookingPrimitives';
import MetaData from "@/hooks/useMetaData";
import { CalendarClient } from '@/components/calendar/CalendarClient';

export default async function CalendarPage() {
    await requireAuth();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return null;

    const supabase = await createServerClient();

    // 1. Fetch Main Calendars
    const { data: calendars } = await supabase
        .from('booking_calendars')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

    // 2. Fetch Recent Appointments
    const { data: recentApts } = await supabase
        .from('appointments')
        .select('*, contact:contacts(first_name, last_name, email)')
        .eq('workspace_id', workspaceId)
        .order('start_time', { ascending: false })
        .limit(10);

    // 3. Analytics & Intelligence (AI Engine)
    const analyticsRes = await getBookingAnalytics(workspaceId);
    const analytics = analyticsRes.success ? analyticsRes.data : [];

    // Default to first calendar for settings preview
    const activeCalendar = calendars?.[0];

    const outcomesRes = activeCalendar ? await getCalendarOutcomes(activeCalendar.id) : { success: true, data: [] };
    const intakeRes = activeCalendar ? await getIntakeForm(activeCalendar.id) : { success: true, data: null };

    return (
        <MetaData pageTitle="Calendar">
            <Wrapper>
                <div className="app__slide-wrapper">
                    <div className="space-y-8">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
                            <div>
                                <h1 className="card__title !text-4xl uppercase mb-1">Appointment <span className="text-primary">Calendar</span></h1>
                                <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Manage your schedule and bookings</p>
                            </div>
                        </div>

                        <CalendarClient appointments={recentApts || []} calendars={calendars || []} />
                    </div>
                </div>
            </Wrapper>
        </MetaData>
    );
}
