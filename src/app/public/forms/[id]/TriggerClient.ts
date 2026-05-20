/**
 * TriggerClient — client-side helper to send events to the server automation route.
 */

export async function sendTriggerEvent(
  formId: string,
  workspaceId: string | null,
  event: string,
  payload: {
    values: Record<string, any>;
    progressPercent: number;
    attribution: any;
    isReturningContact: boolean;
  }
) {
  if (!workspaceId) return;
  try {
    fetch(`/api/public/forms/${formId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event,
        workspaceId,
        values: payload.values,
        completionPercentage: payload.progressPercent,
        attribution: payload.attribution,
        isReturningContact: payload.isReturningContact,
      })
    });
  } catch (e) {
    console.error('[Event dispatch error]', e);
  }
}
