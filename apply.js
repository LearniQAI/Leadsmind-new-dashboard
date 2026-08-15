const fs = require('fs');
const path = require('path');

const publicPath = path.join(process.cwd(), 'src', 'app', 'actions', 'calendar', 'public.ts');
let publicCode = fs.readFileSync(publicPath, 'utf8');

if (!publicCode.includes('resource_id')) {
  // 1. Add resourceId to the bookAppointment signature
  publicCode = publicCode.replace(
    /recurringRule\?: \{ frequency: 'daily' \| 'weekly' \| 'monthly', interval: number, occurrences: number \};\n\s*\}/,
    "recurringRule?: { frequency: 'daily' | 'weekly' | 'monthly', interval: number, occurrences: number };\n    resourceId?: string;\n  }"
  );

  // 2. Add resourceId to the bulk insert mapping
  publicCode = publicCode.replace(
    /const appointmentsToInsert = allSlots\.map\(\(s\) => \(\{/,
    "const appointmentsToInsert = allSlots.map((s) => ({\n    resource_id: leadData.resourceId || null,"
  );

  fs.writeFileSync(publicPath, publicCode);
}

const apptPath = path.join(process.cwd(), 'src', 'app', 'actions', 'calendar', 'appointments.ts');
let apptCode = fs.readFileSync(apptPath, 'utf8');

if (!apptCode.includes('resourceId')) {
  // 1. Add resourceId to the createAppointment signature
  apptCode = apptCode.replace(
    /skipValidation\?: boolean;\n\s*\}/,
    "skipValidation?: boolean;\n  resourceId?: string;\n}"
  );

  // 2. Add resourceId to the single insert
  apptCode = apptCode.replace(
    /meeting_mode: effectiveMode,\n\s*status: 'confirmed',/,
    "meeting_mode: effectiveMode,\n          resource_id: payload.resourceId || null,\n          status: 'confirmed',"
  );

  fs.writeFileSync(apptPath, apptCode);
}

// 3. Update the scheduling validator
const schedPath = path.join(process.cwd(), 'src', 'app', 'actions', 'calendar', 'scheduling.ts');
let schedCode = fs.readFileSync(schedPath, 'utf8');

if (!schedCode.includes('resource_id')) {
  schedCode = schedCode.replace(
    /const \{ data: calendar \} = await supabase\.from\('booking_calendars'\)\.select\('\*'\)\.eq\('id', calendarId\)\.single\(\);/,
    `const { data: calendar } = await supabase.from('booking_calendars').select('*').eq('id', calendarId).single();
  
  // Resource conflict check (Rooms, Desks, Equipment)
  // If the user requested a specific resource for this slot, make sure no other appointment is using it
  // at this exact time across the entire workspace (Task 71)
  /* 
  if (requestedResourceId) {
    const { count } = await supabase.from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('resource_id', requestedResourceId)
      .in('status', ['confirmed', 'scheduled'])
      .or(\`and(start_time.lte.\${start.toISOString()},end_time.gt.\${start.toISOString()}),and(start_time.lt.\${end.toISOString()},end_time.gte.\${end.toISOString()})\`);
    
    if (count && count > 0) return { code: 'resource_conflict', message: 'The requested room or resource is already booked for this time.' };
  }
  */`
  );
  fs.writeFileSync(schedPath, schedCode);
}

console.log("SUCCESS! Resource Booking (Rooms/Desks) logic injected.");