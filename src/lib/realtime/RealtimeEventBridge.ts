/**
 * RealtimeEventBridge — coordinates Supabase Realtime event subscriptions,
 * payload validation, connection recovery, and local event dispatch loop.
 */

import { createClient } from '@/lib/supabase/client';

export type RealtimeEventHandler = (payload: any) => void;

class EventBridge {
  private listeners: Record<string, Set<RealtimeEventHandler>> = {};
  private channels: Record<string, any> = {};
  private reconnectInterval = 5000;

  /**
   * Subscribe to form-scoped updates.
   */
  subscribe(formId: string, eventType: string, callback: RealtimeEventHandler) {
    const key = `${formId}:${eventType}`;
    if (!this.listeners[key]) {
      this.listeners[key] = new Set();
    }
    this.listeners[key].add(callback);

    // Initialize Supabase channel if not active
    this.initChannel(formId);
    return () => this.unsubscribe(formId, eventType, callback);
  }

  /**
   * Unsubscribe from events.
   */
  unsubscribe(formId: string, eventType: string, callback: RealtimeEventHandler) {
    const key = `${formId}:${eventType}`;
    if (this.listeners[key]) {
      this.listeners[key].delete(callback);
    }
  }

  /**
   * Broadcast an event payload to the workspace channel.
   */
  async broadcast(formId: string, eventType: string, payload: any): Promise<boolean> {
    const channel = this.initChannel(formId);
    try {
      await channel.send({
        type: 'broadcast',
        event: eventType,
        payload: {
          ...payload,
          timestamp: new Date().toISOString()
        }
      });
      return true;
    } catch (err) {
      console.warn('[EventBridge] Broadcast send failed, falling back locally:', err);
      // Trigger locally for fallback safety
      this.triggerLocal(formId, eventType, payload);
      return false;
    }
  }

  private initChannel(formId: string) {
    if (this.channels[formId]) return this.channels[formId];

    const supabase = createClient();
    const channel = supabase.channel(`form_sync:${formId}`, {
      config: {
        broadcast: { self: true }
      }
    });

    channel
      .on('broadcast', { event: '*' }, ({ event, payload }) => {
        this.triggerLocal(formId, event, payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log(`[EventBridge] Connected to form channel: ${formId}`);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn('[EventBridge] Channel disconnected, retrying connection...');
          setTimeout(() => this.reconnect(formId), this.reconnectInterval);
        }
      });

    this.channels[formId] = channel;
    return channel;
  }

  private reconnect(formId: string) {
    if (this.channels[formId]) {
      const supabase = createClient();
      supabase.removeChannel(this.channels[formId]);
      delete this.channels[formId];
    }
    this.initChannel(formId);
  }

  private triggerLocal(formId: string, eventType: string, payload: any) {
    const key = `${formId}:${eventType}`;
    if (this.listeners[key]) {
      this.listeners[key].forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error('[EventBridge] Listener exception:', err);
        }
      });
    }
  }
}

export const RealtimeEventBridge = new EventBridge();
