/**
 * DraftSyncEngine — handles event-driven draft changes, workflow modifications,
 * and publish synchronization notifications.
 */

import { RealtimeEventBridge } from './RealtimeEventBridge';

export interface SyncPayload {
  actor: string;
  timestamp: string;
  changeType: 'fields' | 'config' | 'workflow' | 'publish';
  details: any;
}

export const DraftSyncEngine = {
  /**
   * Broadcast a lightweight draft update event to other editors.
   */
  async notifyDraftChanged(
    formId: string,
    actor: string,
    changeType: SyncPayload['changeType'],
    details: any = {}
  ): Promise<boolean> {
    const payload: SyncPayload = {
      actor,
      timestamp: new Date().toISOString(),
      changeType,
      details
    };
    return RealtimeEventBridge.broadcast(formId, 'draft_sync_event', payload);
  },

  /**
   * Register listener callback for incoming draft updates.
   */
  onSyncReceived(
    formId: string,
    callback: (sync: SyncPayload) => void
  ): () => void {
    return RealtimeEventBridge.subscribe(formId, 'draft_sync_event', (payload) => {
      callback(payload);
    });
  },

  /**
   * Notify other active sessions about release publishing completions.
   */
  async notifyPublishEvent(
    formId: string,
    actor: string,
    versionNumber: number
  ): Promise<boolean> {
    return RealtimeEventBridge.broadcast(formId, 'governance_event', {
      actor,
      timestamp: new Date().toISOString(),
      action: 'publish',
      versionNumber
    });
  },

  /**
   * Register listener callback for publish/rollback events.
   */
  onGovernanceEventReceived(
    formId: string,
    callback: (govEvent: { actor: string; action: string; versionNumber?: number }) => void
  ): () => void {
    return RealtimeEventBridge.subscribe(formId, 'governance_event', (payload) => {
      callback(payload);
    });
  }
};
