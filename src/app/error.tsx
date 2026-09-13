'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-dash-bg px-6 py-12 text-center overflow-hidden">
      {/* Soft brand-colored glow — subtle premium polish, not a hard block of color */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: 'radial-gradient(circle, #1359FF 0%, transparent 70%)' }}
      />

      <div className="relative flex flex-col items-center max-w-md">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red/10 border border-red/20">
          <AlertTriangle className="h-7 w-7 text-red" strokeWidth={2} />
        </div>

        <h1 className="text-2xl font-bold text-dash-text mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-dash-textMuted leading-relaxed mb-8">
          An unexpected error occurred. Please try again, or contact support if the problem persists.
        </p>

        <div className="flex items-center gap-3">
          <DashButton onClick={reset} size="default">
            <RefreshCw className="h-4 w-4" />
            Try again
          </DashButton>
          <DashButton asChild variant="ghost" size="default">
            <a href="/">
              Go home
              <ArrowRight className="h-4 w-4" />
            </a>
          </DashButton>
        </div>

        {error.digest && (
          <p className="mt-8 text-[11px] text-dash-textMuted/70 font-mono">
            Error ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
