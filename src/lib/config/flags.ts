/**
 * Master switch to temporarily pause all plan/upgrade restrictions across the app for testing.
 * Set NEXT_PUBLIC_ENFORCE_PLAN_LIMITS=false in .env.local to pause limits during local testing.
 * If absent or not 'false', standard plan/tier limits are enforced.
 */
export const ENFORCE_PLAN_LIMITS = process.env.NEXT_PUBLIC_ENFORCE_PLAN_LIMITS !== 'false';
