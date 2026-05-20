'use client';

import { AttributionData } from './AttributionCapture';

export interface SmartSubmissionPayload {
  formId: string;
  workspaceId: string;
  data: Record<string, any>;
  stepsCompleted: number;
  attribution: AttributionData;
  isReturningContact: boolean;
  contactToken?: string | null;
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
      },
      body: JSON.stringify({
        data: payload.data,
        workspace_id: payload.workspaceId,
        steps_completed: payload.stepsCompleted,
        attribution: payload.attribution,
        is_returning: payload.isReturningContact,
        contact_token: payload.contactToken,
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
