import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Basic IP rate limiting memory store — matches the pattern used for public ticket creation
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;

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

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const rateData = rateLimitMap.get(ip) || { count: 0, lastReset: now };

    if (now - rateData.lastReset > RATE_LIMIT_WINDOW) {
      rateData.count = 1;
      rateData.lastReset = now;
    } else {
      rateData.count++;
      if (rateData.count > MAX_REQUESTS) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    }
    rateLimitMap.set(ip, rateData);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const ticketId = formData.get('ticketId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
    }

    // Resolve the real workspace from the ticket itself — never trust a client-supplied
    // workspaceId directly, since this is a public/unauthenticated endpoint (customers
    // attach files before their ticket reply is created).
    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select('id, workspace_id')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const workspaceId = ticket.workspace_id;

    // Validation checks
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 25MB limit' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Generate clean filename and storage path
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${workspaceId}/widget/${Date.now()}_${cleanFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to private Supabase Storage bucket using service role client
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

    // Generate a long-lived temporary signed URL for viewing the attachment
    const { data: urlData } = await supabaseAdmin.storage
      .from('support-ticket-files')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry

    return NextResponse.json({
      success: true,
      fileUrl: urlData?.signedUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      storagePath
    });

  } catch (error: any) {
    console.error('[support.public-attachments] failed:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
