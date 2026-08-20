'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export async function clockIn(employeeId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('employee_attendance')
    .insert({
      workspace_id: workspaceId,
      employee_id: employeeId,
      date: new Date().toISOString().split('T')[0],
      clock_in: new Date().toISOString(),
      status: 'Present'
    })
    .select()
    .single();
    
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function clockOut(attendanceId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();
  
  // Calculate Overtime (anything over 8 hours)
  const { data: record } = await supabase.from('employee_attendance').select('clock_in').eq('id', attendanceId).single();
  if (!record) return { success: false, error: 'Record not found' };
  
  const clockInTime = new Date(record.clock_in).getTime();
  const clockOutTime = new Date().getTime();
  const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60);
  const overtimeHours = hoursWorked > 8 ? hoursWorked - 8 : 0;

  const { data, error } = await supabase
    .from('employee_attendance')
    .update({
      clock_out: new Date().toISOString(),
      overtime_hours: overtimeHours.toFixed(2)
    })
    .eq('id', attendanceId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();
    
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getAttendanceRecords() {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('employee_attendance')
    .select('*, employees(first_name, last_name, avatar_url)')
    .eq('workspace_id', workspaceId)
    .order('date', { ascending: false });
    
  return { success: !error, data: data || [] };
}
