import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'text/plain',
  'application/zip'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', ticket.workspace_id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const messageId = formData.get('messageId') as string || null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validation checks
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 25MB limit' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Generate clean filename and storage path
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${ticket.workspace_id}/${ticket.id}/${Date.now()}_${cleanFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to private Supabase Storage bucket
    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from('support-ticket-files')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadErr) {
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    // Insert into ticket_attachments
    const { data: attachment, error: dbErr } = await supabaseAdmin
      .from('ticket_attachments')
      .insert({
        ticket_id: ticket.id,
        message_id: messageId,
        workspace_id: ticket.workspace_id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        uploaded_by: userId
      })
      .select()
      .single();

    if (dbErr) {
      return NextResponse.json({ error: 'Failed to record attachment' }, { status: 500 });
    }

    // Generate a temporary signed URL for immediate download
    const { data: urlData } = await supabaseAdmin.storage
      .from('support-ticket-files')
      .createSignedUrl(storagePath, 60 * 60);

    return NextResponse.json({
      success: true,
      attachment: {
        ...attachment,
        url: urlData?.signedUrl
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
