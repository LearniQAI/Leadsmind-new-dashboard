/**
 * RuntimeProfiler — tracks rendering times, context propagation delays,
 * and alerts the logging system when performance SLA budgets are breached.
 */

import { DiagnosticsService } from './DiagnosticsService';

export const RuntimeProfiler = {
  privateBenchmarks: new Map<string, number>(),

  /**
   * Start benchmark timer tracking.
   */
  startTimer(label: string) {
    if (typeof performance === 'undefined') return;
    this.privateBenchmarks.set(label, performance.now());
  },

  /**
   * Stop benchmark timer tracking and evaluate performance SLA.
   */
  endTimer(formId: string, label: string, slaBudgetMs: number = 300): number {
    if (typeof performance === 'undefined') return 0;

    const start = this.privateBenchmarks.get(label);
    if (!start) return 0;

    const duration = performance.now() - start;
    this.privateBenchmarks.delete(label);

    // If duration breaches SLA budget, trigger telemetry alert
    if (duration > slaBudgetMs) {
      console.warn(`[RuntimeProfiler] "${label}" breached SLA budget: ${duration.toFixed(2)}ms (Budget: ${slaBudgetMs}ms)`);
      DiagnosticsService.logError(
        formId,
        'runtime',
        `Performance SLA Breach: ${label} took ${duration.toFixed(1)}ms`,
        'RuntimeProfiler',
        { durationMs: duration, budgetMs: slaBudgetMs }
      );
    }

    return duration;
  }
};
