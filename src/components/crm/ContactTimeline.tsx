import React from 'react';
import { ContactActivity } from '@/types/crm';
import { TimelineItem } from './TimelineItem';

interface ContactTimelineProps {
  activities: ContactActivity[];
}

export function ContactTimeline({ activities }: ContactTimelineProps) {
  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[14px] font-bold !text-dash-text">
          Relationship Timeline
        </h3>
        <button className="text-[10px] font-bold text-dash-accent hover:underline">
          Filter Activities
        </button>
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-dash-border before:to-transparent">
        {activities.length === 0 ? (
          <div className="pl-12 py-4">
            <p className="text-[12px] !text-dash-textMuted italic">No activity recorded for this contact yet.</p>
          </div>
        ) : (
          activities.map((activity) => (
            <TimelineItem key={activity.id} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
}
