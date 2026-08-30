// Pure recovery-link helper — no email/logger deps, safe to import from client components.

/**
 * Generates a secure recovery link for a form submission session
 */
export function generateRecoveryLink(formId: string, token: string): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${origin}/public/forms/${formId}?lm_recovery_token=${token}`;
}
