'use client';

import { AttributionData } from './AttributionCapture';
import { newClientRequestId } from '@/lib/http/requestId';

export interface SmartSubmissionPayload {
  formId: string;
  workspaceId: string;
  data: Record<string, any>;
  stepsCompleted: number;
  attribution: AttributionData;
  isReturningContact: boolean;
  contactToken?: string | null;
  variantId?: string;
  // Idempotency key: same value across retries/double-clicks of ONE submit attempt, regenerated
  // by the caller after a successful submit or a form reset. The server enforces this as a real
  // UUID and a unique (form_id, client_submission_id) pair.
  clientSubmissionId: string;
}

export interface SmartSubmissionResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}

export async function submitSmartForm(
  payload: SmartSubmissionPayload
): Promise<SmartSubmissionResult> {
  try {
    const res = await fetch(`/api/public/forms/${payload.formId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': newClientRequestId(),
      },
      body: JSON.stringify({
        data: payload.data,
        workspace_id: payload.workspaceId,
        steps_completed: payload.stepsCompleted,
        attribution: payload.attribution,
        is_returning: payload.isReturningContact,
        contact_token: payload.contactToken,
        variant_id: payload.variantId || null,
        client_submission_id: payload.clientSubmissionId,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: json.error || `Submission failed (${res.status})`,
      };
    }

    return {
      success: true,
      submissionId: json.submission_id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error. Please check your connection.',
    };
  }
}
