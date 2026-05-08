import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getComprehensiveCalendarAnalytics } from '@/app/actions/calendar';
import CalendarAnalyticsClient from '@/components/calendar/CalendarAnalyticsClient';

export default async function AnalyticsPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  // Use the comprehensive analytics function which returns the expected data structure
  const res = await getComprehensiveCalendarAnalytics();
  if (!res.success) return <div>Failed to load data</div>;

  return <CalendarAnalyticsClient data={res.data} />;
}
