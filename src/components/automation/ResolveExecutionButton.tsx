'use client';

import { useState, useTransition } from 'react';
import { resolveExecution } from '@/app/actions/automation-workspace';

export function ResolveExecutionButton({ executionId }: { executionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);

  if (resolved) {
    return (
      <span className="px-4 py-2 text-green text-xs font-bold">
        Resolved
      </span>
    );
  }

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await resolveExecution(executionId);
          setResolved(true);
        });
      }}
      className="px-4 py-2 bg-red/10 hover:bg-red/20 text-red rounded-xl text-xs font-bold transition-colors motion-reduce:transition-none disabled:opacity-50"
    >
      {isPending ? 'Resolving...' : 'Resolve manually'}
    </button>
  );
}
