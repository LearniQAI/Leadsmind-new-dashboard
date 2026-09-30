import { Inngest } from 'inngest'

// The SDK's default fetch (no custom fetch configured) is raw, unwrapped globalThis.fetch — no
// AbortSignal, no timeout, anywhere in its send()/retryWithBackoff() path (confirmed by reading
// the installed inngest@4.18.1 source: helpers/promises.js retryWithBackoff and
// helpers/env.js getFetch both add no timeout of their own). If the network path to Inngest's
// ingestion endpoint is unreachable/blackholed (not a fast HTTP error — a genuinely hung
// connection), an awaited inngest.send() call blocks until the caller's own platform ceiling
// kills the invocation, which is consistent with a real production incident where a form-submit
// request hung for 4-5 minutes. This wraps every fetch this client makes (sends, and any other
// internal Inngest API traffic) with a bounded AbortSignal so a hung connection is cancelled
// instead of blocking indefinitely. 10s (not the submit route's own tighter 3s budget) because
// this client is shared with function-execution machinery (step checkpointing etc. inside
// workflowTriggerFn) that has no <2s target of its own — callers on the request path that need a
// tighter bound (e.g. the public form-submit route) additionally race this with their own
// shorter timeout rather than relying on this alone.
function fetchWithTimeout(timeoutMs: number): typeof fetch {
  return (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) })
}

export const inngest = new Inngest({
  id: 'leadsmind',
  name: 'LeadsMind',
  fetch: fetchWithTimeout(10_000),
})
