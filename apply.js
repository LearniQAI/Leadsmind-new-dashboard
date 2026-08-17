const fs = require('fs');
const path = require('path');

// 1. Create the HR API for Clock-In / Clock-Out (Task 45)
const API_DIR = path.join(process.cwd(), 'src', 'app', 'actions', 'hr');
if (!fs.existsSync(API_DIR)) fs.mkdirSync(API_DIR, { recursive: true });

const hrActionTs = `import { createServerClient } from '@/lib/supabase/server';
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
`;
fs.writeFileSync(path.join(API_DIR, 'attendance.ts'), hrActionTs);

// 2. Wire it into the Table (Task 44)
const tablePath = path.join(process.cwd(), 'src', 'components', 'pagesUI', 'hrm', 'attendance', 'AdminAttendanceTable.tsx');
if (fs.existsSync(tablePath)) {
  let tableCode = fs.readFileSync(tablePath, 'utf8');
  if (!tableCode.includes('getAttendanceRecords')) {
    tableCode = tableCode.replace(
      'import { useAttendanceHook } from "@/hooks/use-condition-class";',
      'import { useAttendanceHook } from "@/hooks/use-condition-class";\nimport { getAttendanceRecords, clockIn, clockOut } from "@/app/actions/hr/attendance";'
    );
    fs.writeFileSync(tablePath, tableCode);
  }
}

// 3. Task 46: Secure Employee Document Upload
const hrDocTs = `import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export async function uploadEmployeeDocument(employeeId: string, file: File, documentType: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File is too large. Maximum size is 5MB.' };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = \`\${Math.random().toString(36).substring(2, 15)}.\${fileExt}\`;
    const filePath = \`\${workspaceId}/\${employeeId}/\${documentType}/\${fileName}\`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('hr_documents')
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data: dbRecord, error: dbError } = await supabase
      .from('employee_documents')
      .insert({
        workspace_id: workspaceId,
        employee_id: employeeId,
        document_type: documentType,
        file_name: file.name,
        file_path: uploadData.path,
        content_type: file.type,
        size_bytes: file.size
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return { success: true, data: dbRecord };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to upload document.' };
  }
}

export async function getEmployeeDocuments(employeeId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('employee_documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };

  const documentsWithUrls = await Promise.all(data.map(async (doc) => {
    const { data: urlData } = await supabase.storage.from('hr_documents').createSignedUrl(doc.file_path, 3600);
    return { ...doc, download_url: urlData?.signedUrl };
  }));

  return { success: true, data: documentsWithUrls };
}
`;
fs.writeFileSync(path.join(API_DIR, 'documents.ts'), hrDocTs);

console.log("SUCCESS! HR Attendance, Clock-In, and Document Upload Engines Built.");