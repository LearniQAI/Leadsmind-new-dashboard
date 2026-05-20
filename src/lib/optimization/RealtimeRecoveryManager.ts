/**
 * RealtimeRecoveryManager — handles websocket reconnection logic,
 * exponential backoff intervals, event deduplication, and memory leaks cleanup.
 */

export class RealtimeRecoveryManager {
  private activeSubscriptions = new Map<string, () => void>();
  private processedEvents = new Set<string>();
  private maxDeduplicationCache = 1000;

  /**
   * Tracks active channel cleanup routines.
   */
  registerSubscription(key: string, unsubscribe: () => void) {
    // Prevent duplicate active subscriptions
    if (this.activeSubscriptions.has(key)) {
      try {
        this.activeSubscriptions.get(key)?.();
      } catch (err) {
        console.warn('[RecoveryManager] Prior unsubscribe failed:', err);
      }
    }
    this.activeSubscriptions.set(key, unsubscribe);
  }

  /**
   * Triggers cleanup for subscriptions.
   */
  cleanup(key: string) {
    if (this.activeSubscriptions.has(key)) {
      this.activeSubscriptions.get(key)?.();
      this.activeSubscriptions.delete(key);
    }
  }

  /**
   * Perform reconnect backoff delay mapping.
   */
  getBackoffDelay(attempt: number): number {
    // Exponential backoff capped at 30 seconds
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }

  /**
   * Deduplicates incoming events using transaction IDs.
   */
  isDuplicateEvent(eventId: string): boolean {
    if (this.processedEvents.has(eventId)) {
      return true;
    }

    this.processedEvents.add(eventId);
    
    // Evict cache items if exceeding limit
    if (this.processedEvents.size > this.maxDeduplicationCache) {
      const firstItem = this.processedEvents.values().next().value;
      if (firstItem !== undefined) {
        this.processedEvents.delete(firstItem);
      }
    }
    
    return false;
  }
}
