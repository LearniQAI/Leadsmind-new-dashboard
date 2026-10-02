// User-facing copy for the failure codes the AI research batch route returns per contact.
const MESSAGES: Record<string, string> = {
  not_found: 'That contact was not found in this workspace.',
  no_company_domain: "This contact has no company domain to research (personal email addresses don't count).",
  insufficient_credits: 'Not enough AI credits to run research.',
  timeout: 'The AI provider took too long to respond. No credit was kept. Please try again.',
  provider_error: 'The research run failed. No credit was kept. Please try again.',
  empty_result: 'The AI returned nothing usable. No credit was kept. Please try again.',
  invalid_result: 'The AI returned an unreadable result. No credit was kept. Please try again.',
  save_failed: 'The result could not be saved. No credit was kept. Please try again.',
};

export function researchErrorMessage(code: string | undefined | null): string {
  return (code && MESSAGES[code]) || 'Research failed. Please try again.';
}

// First per-contact failure of a batch response (or the top-level error), as readable text.
export function researchFailureFromResponse(body: any): string | null {
  if (body?.success !== false && !body?.error) return null;
  const item = Array.isArray(body?.details) ? body.details.find((d: any) => d && d.success === false) : null;
  if (item) return researchErrorMessage(item.error);
  return typeof body?.error === 'string' ? body.error : researchErrorMessage(null);
}
