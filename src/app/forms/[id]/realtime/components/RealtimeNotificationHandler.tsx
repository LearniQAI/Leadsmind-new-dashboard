'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { DraftSyncEngine } from '@/lib/realtime/DraftSyncEngine';

interface RealtimeNotificationHandlerProps {
  formId: string;
  currentUserEmail: string;
  onGovernanceTriggered?: () => void;
}

export function RealtimeNotificationHandler({
  formId,
  currentUserEmail,
  onGovernanceTriggered
}: RealtimeNotificationHandlerProps) {
  useEffect(() => {
    // 1. Listen for background governance logs publishes/rollbacks
    const unsubGov = DraftSyncEngine.onGovernanceEventReceived(formId, (payload) => {
      if (payload.actor !== currentUserEmail) {
        toast.info(
          `Production Release: Form published by ${payload.actor}! (Version #${payload.versionNumber || ''})`,
          { duration: 6000 }
        );
        onGovernanceTriggered?.();
      }
    });

    // 2. Listen for background draft edits
    const unsubSync = DraftSyncEngine.onSyncReceived(formId, (payload) => {
      if (payload.actor !== currentUserEmail) {
        if (payload.changeType === 'publish') {
          toast.success(`Production Release: Form published by ${payload.actor}!`);
          onGovernanceTriggered?.();
        } else {
          toast.message(
            `Workspace update: ${payload.actor} modified form ${payload.changeType}`,
            { duration: 4000 }
          );
        }
      }
    });

    return () => {
      unsubGov();
      unsubSync();
    };
  }, [formId, currentUserEmail]);

  return null; // Headless subscriber
}
