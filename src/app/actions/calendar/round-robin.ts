'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { getHostAvailability } from '@/lib/calendar/availability';

/**
 * --- LEAMSMIND ROUND ROBIN ENGINE ---
 * Orchestrates team-based lead distribution using advanced routing algorithms.
 */

interface AssignmentResult {
  userId: string;
  algorithm: string;
}

/**
 * Main entry point for round-robin assignment.
 */
export async function getNextHost(calendarId: string, algorithm: 'equal' | 'priority' | 'availability'): Promise<AssignmentResult | null> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const supabase = await createServerClient();

  // 1. Fetch participating team members
  const { data: participants, error } = await supabase
    .from('round_robin_assignment')
    .select('*')
    .eq('calendar_id', calendarId)
    .order('assignment_count', { ascending: true });

  if (error || !participants || participants.length === 0) return null;

  switch (algorithm) {
    case 'equal':
      return { userId: participants[0].user_id, algorithm: 'equal' };

    case 'priority':
      return handlePriorityWeighting(participants);

    case 'availability':
      return handleAvailabilityFirst(calendarId, participants);

    default:
      return { userId: participants[0].user_id, algorithm: 'default' };
  }
}

/**
 * ALGORITHM: Priority Weighting (1-10 Slider scale)
 * Selects a host based on weighted probability.
 */
function handlePriorityWeighting(participants: any[]): AssignmentResult {
  const totalWeight = participants.reduce((sum, p) => sum + (p.weight || 5), 0);
  let random = Math.random() * totalWeight;

  for (const p of participants) {
    if (random < (p.weight || 5)) {
      return { userId: p.user_id, algorithm: 'priority' };
    }
    random -= (p.weight || 5);
  }

  return { userId: participants[0].user_id, algorithm: 'priority' };
}

/**
 * ALGORITHM: Availability-First
 * Selects the host with the earliest chronological opening.
 */
async function handleAvailabilityFirst(calendarId: string, participants: any[]): Promise<AssignmentResult> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endRange = new Date(tomorrow);
  endRange.setDate(endRange.getDate() + 7); // Check next 7 days

  const results = await Promise.all(participants.map(async (p) => {
    const slots = await getHostAvailability(p.user_id, tomorrow.toISOString(), endRange.toISOString(), 30);
    return {
      userId: p.user_id,
      earliestSlot: slots.length > 0 ? slots[0].start : '9999-12-31'
    };
  }));

  const winner = results.sort((a, b) => a.earliestSlot.localeCompare(b.earliestSlot))[0];
  return { userId: winner.userId, algorithm: 'availability' };
}

/**
 * Increments the assignment count for a host to maintain 'Equal Distribution'.
 */
export async function trackAssignment(calendarId: string, userId: string) {
  const supabase = await createServerClient();
  await supabase.rpc('fn_increment_assignment', { 
    p_calendar_id: calendarId, 
    p_user_id: userId 
  });
}
