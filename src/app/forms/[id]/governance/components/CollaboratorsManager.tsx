'use client';

import { InviteManager } from '@/components/collaboration/InviteManager';

export function CollaboratorsManager({ 
  formId, 
  workspaceId, 
  formName 
}: { 
  formId: string; 
  workspaceId: string; 
  formName: string; 
}) {
  return (
    <InviteManager formId={formId} formName={formName} />
  );
}
