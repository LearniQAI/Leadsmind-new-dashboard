'use client';

// PrefillEngine fetching prefill data based on the lm_token from URL

export interface PrefillResult {
  prefillValues: Record<string, any>;
  returningContact: {
    id: string;
    name: string;
  } | null;
  error?: string;
}

export async function fetchPrefillData(formId: string): Promise<PrefillResult> {
  if (typeof window === 'undefined') {
    return { prefillValues: {}, returningContact: null };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('lm_token');

  if (!token) {
    return { prefillValues: {}, returningContact: null };
  }

  try {
    const res = await fetch(`/api/public/forms/${formId}/prefill?lm_token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      return { prefillValues: {}, returningContact: null, error: 'Failed to load prefill data' };
    }
    
    const data = await res.json();
    return {
      prefillValues: data.prefill || {},
      returningContact: data.returningContact || null,
      error: data.error
    };
  } catch (err: any) {
    return { prefillValues: {}, returningContact: null, error: 'Network error fetching prefill' };
  }
}
