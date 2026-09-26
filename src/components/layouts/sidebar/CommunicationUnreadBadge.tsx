'use client';

import React, { useEffect } from 'react';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import { startUnreadStore, useUnreadCounts } from '@/lib/conversations/unreadStore';

// Live unread total across every Communications channel, for the nav. The number is real read state
// (see lib/conversations/unreadStore), not toast history.
//   corner: overlaid on the collapsed rail icon
//   pill:   inline at the end of a labelled nav row

export default function CommunicationUnreadBadge({ variant }: { variant: 'corner' | 'pill' }) {
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;
  useEffect(() => { startUnreadStore(workspaceId); }, [workspaceId]);
  const { total } = useUnreadCounts();
  if (!total) return null;

  const label = total > 99 ? '99+' : String(total);
  const a11y = `${total} unread ${total === 1 ? 'message' : 'messages'}`;

  if (variant === 'corner') {
    return (
      <span
        aria-label={a11y}
        className="pointer-events-none absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full
          bg-dash-accent text-white text-[10px] font-bold leading-[18px] text-center tabular-nums
          ring-2 ring-white shadow-[0_0_0_3px_rgba(19,89,255,0.18),0_4px_10px_-2px_rgba(19,89,255,0.55)]
          animate-[lm-badge-in_220ms_ease-out] motion-reduce:animate-none"
      >
        {label}
      </span>
    );
  }
  return (
    <span
      aria-label={a11y}
      className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-dash-accent text-white text-[10.5px]
        font-bold leading-5 text-center tabular-nums shadow-[0_2px_8px_-2px_rgba(19,89,255,0.6)]"
    >
      {label}
    </span>
  );
}
