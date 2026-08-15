const fs = require('fs');
const path = require('path');

// 1. Create the new Recurring utility file
const libDir = path.join(process.cwd(), 'src', 'lib', 'calendar');
if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });

const recurTs = `import { addDays, addWeeks, addMonths, parseISO, formatISO } from 'date-fns';

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
`;
fs.writeFileSync(path.join(libDir, 'recurring.ts'), recurTs);

// 2. Inject it into the Booking Engine
const publicPath = path.join(process.cwd(), 'src', 'app', 'actions', 'calendar', 'public.ts');
let publicCode = fs.readFileSync(publicPath, 'utf8');

if (!publicCode.includes('recurringRule')) {
  publicCode = publicCode.replace(
    /popiaConsent: boolean;\n\s*answers\?: Record<string, string>;\n\s*\}/,
    "popiaConsent: boolean;\n    answers?: Record<string, string>;\n    recurringRule?: { frequency: 'daily' | 'weekly' | 'monthly', interval: number, occurrences: number };\n  }"
  );

  publicCode = publicCode.replace(
    "import { logPopiaConsent } from '@/lib/calendar/popia';",
    "import { logPopiaConsent } from '@/lib/calendar/popia';\nimport { generateRecurringSlots } from '@/lib/calendar/recurring';"
  );

  publicCode = publicCode.replace(
    /const validation = await validateSlot\(calendarId, startTime, endTime\);\n\s*if \(!validation\.available\) \{\n\s*return \{ success: false, error: validation\.reason \};\n\s*\}/,
    "const validation = await validateSlot(calendarId, startTime, endTime);\n  if (!validation.available) {\n    return { success: false, error: validation.reason };\n  }\n\n  let allSlots = [{ start: startTime, end: endTime }];\n  if (leadData.recurringRule && leadData.recurringRule.occurrences > 1) {\n    allSlots = generateRecurringSlots(startTime, endTime, leadData.recurringRule);\n    for (const s of allSlots) {\n       const v = await validateSlot(calendarId, s.start, s.end);\n       if (!v.available) return { success: false, error: 'Cannot book recurring series: the slot on ' + s.start.split('T')[0] + ' is unavailable.' };\n    }\n  }"
  );

  publicCode = publicCode.replace(
    /const \{ data: appointment, error: insertError \} = await supabase\s*\.from\('appointments'\)\s*\.insert\(\{([\s\S]*?)\}\)\s*\.select\(\)\s*\.single\(\);/,
    "const appointmentsToInsert = allSlots.map((s) => ({" + "$1" + ", start_time: s.start, end_time: s.end}));\n  const { data: insertedList, error: insertError } = await supabase\n    .from('appointments')\n    .insert(appointmentsToInsert)\n    .select();\n  const appointment = insertedList?.[0];"
  );
  fs.writeFileSync(publicPath, publicCode);
}
console.log("SUCCESS! Recurring Meetings logic injected.");