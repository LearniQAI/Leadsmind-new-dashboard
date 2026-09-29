import { waitUntil } from '@vercel/functions';
import { logger, safeLog } from '@/shared/logger';
import { createAdminClient } from '@/lib/supabase/server';
import { userSafeMessage } from '@/shared/errors/userSafe';

// Step timer for the 5 launch-instrumented flows only (public form submit, automation execution,
// social OAuth connect, inventory create, AI research) — not a general-purpose tracer. Each
// mark() records elapsed ms since the previous mark (or since start on the first call).
export function createStepTimer() {
  const start = process.hrtime.bigint();
  let last = start;
  const steps: Record<string, number> = {};

  return {
    mark(step: string) {
      const now = process.hrtime.bigint();
      steps[step] = Number(now - last) / 1_000_000;
      last = now;
    },
    steps(): Record<string, number> {
      return steps;
    },
    totalMs(): number {
      return Number(process.hrtime.bigint() - start) / 1_000_000;
    },
  };
}

export interface RequestCompletionInfo {
  requestId: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  steps?: Record<string, number>;
  workspaceId?: string | null;
  userId?: string | null;
  error?: unknown;
}

// A step-timing error field is a diagnostic hint, never the raw exception — provider/DB errors
// can embed hosts, connection strings, or secrets. Route everything through userSafeMessage the
// same way client-facing errors already are (src/shared/errors/userSafe.ts).
function safeErrorMessage(error: unknown): string | null {
  if (!error) return null;
  return userSafeMessage(error, 'internal_error');
}

// Logs the structured completion line immediately (cheap, always happens), then schedules the
// request_timings insert via unstable_after() so it runs after the response is sent rather than
// blocking it or racing serverless teardown as a bare fire-and-forget promise would.
export function logRequestComplete(info: RequestCompletionInfo) {
  const errorMessage = safeErrorMessage(info.error);

  safeLog(() =>
    logger.info(
      {
        requestId: info.requestId,
        workspaceId: info.workspaceId ?? null,
        userId: info.userId ?? null,
        route: info.route,
        method: info.method,
        status: info.status,
        durationMs: Math.round(info.durationMs),
        steps: info.steps,
        error: errorMessage,
      },
      'api.request.completed'
    )
  );

  waitUntil(
    (async () => {
      try {
        const supabase = createAdminClient();
        await supabase.from('request_timings').insert({
          request_id: info.requestId,
          workspace_id: info.workspaceId ?? null,
          user_id: info.userId ?? null,
          route: info.route,
          method: info.method,
          status: info.status,
          duration_ms: Math.round(info.durationMs),
          steps: info.steps ?? {},
          error_message: errorMessage,
        });
      } catch (err) {
        // Instrumentation must never surface as a request failure — this only ever runs after
        // the response has already been sent (Vercel's waitUntil keeps the function alive for
        // this promise without blocking/delaying the response itself).
        safeLog(() => logger.warn({ err }, 'request_timings.insert.failed'));
      }
    })()
  );
}
