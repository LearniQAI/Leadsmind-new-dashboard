import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import Wrapper from '@/components/layouts/DefaultWrapper';
import AvailabilityClient from '@/components/calendar/AvailabilityClient';
import { getAvailabilitySettings } from '@/app/actions/calendar/availability';
import { Clock } from 'lucide-react';
import MetaData from '@/hooks/useMetaData';

export default async function AvailabilityPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const res = await getAvailabilitySettings();

  return (
    <MetaData pageTitle="Availability">
      <Wrapper>
        <div className="bg-dash-surface min-h-screen p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-dash-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-lg bg-dash-accent/10 flex items-center justify-center border border-dash-accent/20">
                  <Clock className="h-3.5 w-3.5 text-dash-accent" />
                </div>
                <span className="text-[10px] font-bold text-dash-accent">Booking hours</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight !text-dash-text leading-tight mb-2">Availability</h1>
              <p className="!text-dash-textMuted text-sm font-medium leading-relaxed">
                Set the hours people can actually book you across every booking page — plus buffers, notice, and any
                one-off blocked or extended days.
              </p>
            </div>

            {res.success ? (
              <AvailabilityClient initial={res.data} />
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-dash-border text-center text-sm !text-dash-textMuted">
                Failed to load availability settings: {res.error}
              </div>
            )}
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
