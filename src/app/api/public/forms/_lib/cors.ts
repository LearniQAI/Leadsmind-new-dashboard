import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Shared CORS headers for cross-origin embed requests
export const EMBED_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-workspace-id',
  'Cache-Control': 'no-store',
} as const;

export function corsResponse(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: EMBED_CORS_HEADERS,
  });
}

export function corsError(message: string, status = 400) {
  return corsResponse({ error: message }, status);
}

// Strips any internal / builder-only columns from the public schema
export function sanitizeFormSchema(form: any) {
  return {
    id: form.id,
    name: form.name,
    fields: Array.isArray(form.fields) ? form.fields : [],
    config: form.config || {},
    status: form.status,
  };
}

// Build admin supabase client (bypasses RLS for validated public reads)
export function getAdminSupabase() {
  return createAdminClient();
}
