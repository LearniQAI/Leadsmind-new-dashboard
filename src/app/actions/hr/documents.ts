import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';

// Task 46: Secure Employee Document Upload
export async function uploadEmployeeDocument(employeeId: string, file: File, documentType: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    // 1. Validate file (PDF, PNG, JPG only, max 5MB)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File is too large. Maximum size is 5MB.' };
    }

    // 2. Generate a secure, randomized file path in the workspace bucket
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${workspaceId}/${employeeId}/${documentType}/${fileName}`;

    // 3. Upload to Supabase Storage (Private HR Bucket)
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('hr_documents')
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    // 4. Save the file metadata to the database
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

  // Generate secure download URLs that expire in 1 hour
  const documentsWithUrls = await Promise.all(data.map(async (doc) => {
    const { data: urlData } = await supabase.storage.from('hr_documents').createSignedUrl(doc.file_path, 3600);
    return { ...doc, download_url: urlData?.signedUrl };
  }));

  return { success: true, data: documentsWithUrls };
}
