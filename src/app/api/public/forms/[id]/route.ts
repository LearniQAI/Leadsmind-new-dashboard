import { NextRequest } from 'next/server';
import { corsResponse, corsError, sanitizeFormSchema, getAdminSupabase } from '../_lib/cors';

// GET /api/public/forms/[id]
// Returns the published form schema for the public runtime renderer / embed SDK
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return corsError('Form ID is required', 400);
  }

  try {
    const supabase = getAdminSupabase();

    const { data: form, error } = await supabase
      .from('forms')
      .select('id, name, fields, config, status')
      .eq('id', id)
      .eq('status', 'published')   // CRITICAL: Only serve published forms publicly
      .single();

    if (error || !form) {
      return corsError('Form not found or not published', 404);
    }

    return corsResponse({ form: sanitizeFormSchema(form) });
  } catch (err: any) {
    console.error('[Public Forms API] GET error:', err);
    return corsError('Internal server error', 500);
  }
}

// OPTIONS handler for preflight CORS requests from cross-origin embeds
export async function OPTIONS() {
  return corsResponse(null, 200);
}
