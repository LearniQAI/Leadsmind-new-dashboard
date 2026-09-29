// A number only receives real Cloud API traffic in this state — anything else (ON_PREMISE,
// DISCONNECTED, PENDING, NOT_VERIFIED, etc.) means messages sent to it never reach Meta's Cloud
// API layer at all, regardless of anything on our side (confirmed live against a real number that
// was showing "Connected" in our UI while receiving zero messages).
//
// Lives outside src/app/actions/messaging.ts (a 'use server' Server Actions module) because
// Next.js requires every export from a 'use server' file to be an async function — this is a
// plain sync helper, so it can't be exported from there directly.
export function isCloudApiHealthy(platformType: string | null | undefined, status: string | null | undefined): boolean {
  return platformType === 'CLOUD_API' && status === 'CONNECTED';
}
