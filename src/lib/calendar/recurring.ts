import { addDays, addWeeks, addMonths, parseISO, formatISO } from 'date-fns';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  occurrences: number; 
}

export function generateRecurringSlots(
  baseStartTime: string, 
  baseEndTime: string, 
  rule: RecurrenceRule
): Array<{ start: string, end: string }> {
  const slots = [];
  const baseStart = parseISO(baseStartTime);
  const baseEnd = parseISO(baseEndTime);
  
  slots.push({ start: baseStartTime, end: baseEndTime });
  if (!rule || rule.occurrences <= 1) return slots;

  for (let i = 1; i < rule.occurrences; i++) {
    let nextStart = baseStart;
    let nextEnd = baseEnd;

    if (rule.frequency === 'daily') {
      nextStart = addDays(baseStart, i * rule.interval);
      nextEnd = addDays(baseEnd, i * rule.interval);
    } else if (rule.frequency === 'weekly') {
      nextStart = addWeeks(baseStart, i * rule.interval);
      nextEnd = addWeeks(baseEnd, i * rule.interval);
    } else if (rule.frequency === 'monthly') {
      nextStart = addMonths(baseStart, i * rule.interval);
      nextEnd = addMonths(baseEnd, i * rule.interval);
    }

    slots.push({ start: formatISO(nextStart), end: formatISO(nextEnd) });
  }
  return slots;
}
