import { logger } from '@/shared/logger';

// Maps common Twilio error codes to messages a non-technical admin can act on, instead of
// surfacing raw Twilio exception text.
//
// Lives here (not in src/app/actions/telephony.ts, a 'use server' file) because it's a pure,
// synchronous helper — every export from a 'use server' file must be an async function
// (Next.js's build-time contract for server actions), and this isn't itself a server action,
// just an error-formatting utility several server actions call internally.
export function humanizeTwilioError(err: any): string {
  const code = err?.code;
  if (code === 20003 || err?.status === 401) return 'Twilio rejected these credentials. Reconnect your Twilio account in Settings → Phone & IVR.';
  if (code === 21422) return 'That number is no longer available to purchase — please search again.';
  if (code === 21421) return 'That is not a valid phone number for this Twilio account.';
  if (code === 21210) return 'This Twilio account is not authorized to buy numbers in that country. Check your Twilio Console for geographic permissions.';
  if (code === 20404) return 'That number was not found on your Twilio account. It may have already been released.';
  logger.warn({ err }, 'telephony.twilio_error.unmapped');
  return err?.message || 'Twilio request failed. Please try again.';
}
