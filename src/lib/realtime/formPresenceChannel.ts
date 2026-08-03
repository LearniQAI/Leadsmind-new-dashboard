'use client';

import { createClient } from '@/lib/supabase/client';

// CollaborationIndicator.tsx and InvitePresenceList.tsx both track presence
// for the same form and always mount together on the governance page. Each
// used to call supabase.channel(`form_presence_${formId}`) independently —
// but SupabaseClient.channel() returns the SAME RealtimeChannel instance for
// a topic that's already registered (see RealtimeClient.channel() in
// @supabase/realtime-js), so the second caller's .on('presence', ...) ran on
// a channel the first caller had already subscribed, which throws
// "cannot add `presence` callbacks ... after `subscribe()`." One shared
// channel per formId, ref-counted, fixes the collision at the source instead
// of just reordering .on()/.subscribe() (which was never actually wrong).

type PresenceSyncListener = (state: Record<string, any[]>) => void;
type BroadcastListener = (payload: any) => void;

interface SharedEntry {
  channel: any;
  refCount: number;
  presenceListeners: Set<PresenceSyncListener>;
  broadcastListeners: Set<BroadcastListener>;
}

const registry = new Map<string, SharedEntry>();

export function acquireFormPresenceChannel(formId: string, trackPayload: Record<string, any>) {
  const topic = `form_presence_${formId}`;
  let entry = registry.get(topic);

  if (!entry) {
    const supabase = createClient();
    const channel = supabase.channel(topic, {
      config: { presence: { key: trackPayload.email } },
    });

    const newEntry: SharedEntry = {
      channel,
      refCount: 0,
      presenceListeners: new Set(),
      broadcastListeners: new Set(),
    };
    registry.set(topic, newEntry);
    entry = newEntry;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        newEntry.presenceListeners.forEach((cb) => cb(state));
      })
      .on('broadcast', { event: 'lock_state_change' }, ({ payload }: any) => {
        newEntry.broadcastListeners.forEach((cb) => cb(payload));
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(trackPayload);
        }
      });
  }

  entry.refCount += 1;
  const activeEntry = entry;

  return {
    channel: activeEntry.channel,
    onPresenceSync(cb: PresenceSyncListener) {
      activeEntry.presenceListeners.add(cb);
      return () => activeEntry.presenceListeners.delete(cb);
    },
    onBroadcastLock(cb: BroadcastListener) {
      activeEntry.broadcastListeners.add(cb);
      return () => activeEntry.broadcastListeners.delete(cb);
    },
    release() {
      activeEntry.refCount -= 1;
      if (activeEntry.refCount <= 0) {
        activeEntry.channel.untrack();
        activeEntry.channel.unsubscribe();
        registry.delete(topic);
      }
    },
  };
}
