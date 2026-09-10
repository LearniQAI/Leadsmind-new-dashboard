'use server';

// Task 69 — Recurring / repeating meetings: the server-action surface.
//
// Thin auth layer only: each function verifies the caller with
// requireWorkspaceAccess() and delegates to the engine in
// lib/calendar/recurringSeries.ts. The engine is a plain module (not "use
// server") so it can't be reached from a client without going through these
// wrappers, and so the live verification script can exercise it directly.

import { requireWorkspaceAccess } from '@/lib/auth';
import { toClientError } from '@/shared/errors/AppError';
import {
  createRecurringSeriesCore,
  updateRecurringScopeCore,
  getSeriesForAppointmentCore,
  type CreateRecurringSeriesPayload,
  type RecurrenceScope,
  type RecurrenceScopeAction,
} from '@/lib/calendar/recurringSeries';

export type { RecurrenceScope, RecurrenceScopeAction, CreateRecurringSeriesPayload };

export async function createRecurringSeries(payload: CreateRecurringSeriesPayload) {
  try {
    const ctx = await requireWorkspaceAccess();
    return await createRecurringSeriesCore(ctx, payload);
  } catch (err: any) {
    return { success: false as const, error: toClientError(err).error };
  }
}

export async function updateRecurringScope(params: {
  appointmentId: string;
  scope: RecurrenceScope;
  action: RecurrenceScopeAction;
  newStartTime?: string;
}) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    return await updateRecurringScopeCore(workspaceId, params);
  } catch (err: any) {
    return { success: false as const, error: toClientError(err).error };
  }
}

export async function getSeriesForAppointment(appointmentId: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    return await getSeriesForAppointmentCore(workspaceId, appointmentId);
  } catch (err: any) {
    return { success: false as const, error: toClientError(err).error };
  }
}
