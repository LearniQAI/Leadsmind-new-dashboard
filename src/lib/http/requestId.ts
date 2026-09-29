'use client';

// Generates a per-call request_id for the client side of the 5 launch-instrumented flows
// (public form submit, social OAuth connect, inventory create, AI research — automation
// execution has no client caller of its own). The server validates this as a UUID before
// trusting/logging it (src/shared/logger/requestId.ts) since some of these routes are
// unauthenticated.
export function newClientRequestId(): string {
  return crypto.randomUUID();
}
