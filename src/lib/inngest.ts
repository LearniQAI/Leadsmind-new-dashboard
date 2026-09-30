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
// instead of blocking indefinitely.
//
// 10s, verified (not guessed) to be safe for everything this app's Inngest usage actually does:
// grepped every importer of this client (9 files) — all either call inngest.send() with a small
// event payload (ids, counts, booleans) or register a step.run()-only function (workflowTrigger,
// webhookDispatch, campaignDispatch). None of this codebase's functions use step.fetch or
// step.invoke (grepped, zero matches) — the only step tools that would route a user-supplied,
// potentially-long-running call through this SAME client fetch. Actual external calls made
// *inside* a step.run callback (e.g. webhookDispatchFn's webhook delivery fetches) already carry
// their own separate AbortSignal.timeout and never touch this client's fetch at all. If a new
// caller later adds step.fetch/step.invoke with a payload that can legitimately exceed 10s,
// raise this value (and re-verify) rather than removing the timeout.
//
// Preserves any AbortSignal the SDK/caller already passes rather than overwriting it — a step
// tool wiring its own cancellation (e.g. workflow-level cancellation, waitForSignal-adjacent
// tooling) must still be able to abort this fetch on its own terms; AbortSignal.any() aborts as
// soon as either signal does, so this timeout is additive, never a way to out-wait a real caller
// cancellation.
function fetchWithTimeout(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal
    return fetch(input, { ...init, signal })
  }
}

export const inngest = new Inngest({
  id: 'leadsmind',
  name: 'LeadsMind',
  fetch: fetchWithTimeout(10_000),
})
