/**
 * ConflictDetector — evaluates workspace synchronization drift, soft section locks,
 * and tracks layout outdated/stale warning criteria.
 */

import { PresenceUser } from './PresenceManager';

export interface LockStatus {
  locked: boolean;
  ownerEmail?: string;
}

export const ConflictDetector = {
  /**
   * Evaluates if a specific block or field is locked by another participant.
   */
  checkFieldLock(
    sectionId: string,
    activeSessions: PresenceUser[],
    currentUserId: string
  ): LockStatus {
    // Find if another editor is active in this section
    const otherEditor = activeSessions.find(
      (s) =>
        s.client_id !== currentUserId &&
        s.is_editor &&
        s.editing_section === sectionId
    );

    if (otherEditor) {
      return {
        locked: true,
        ownerEmail: otherEditor.email
      };
    }

    return { locked: false };
  },

  /**
   * Detects if the local workspace configuration has drifted behind remote updates.
   * Compares publish timestamps or version snapshots to flag staleness.
   */
  isWorkspaceStale(
    localLastSaved: string | Date | null,
    remoteLastSaved: string | null
  ): boolean {
    if (!localLastSaved || !remoteLastSaved) return false;

    const localTime = new Date(localLastSaved).getTime();
    const remoteTime = new Date(remoteLastSaved).getTime();

    // Stale if remote saved timestamp is newer by at least 1 second
    return remoteTime - localTime > 1000;
  }
};
