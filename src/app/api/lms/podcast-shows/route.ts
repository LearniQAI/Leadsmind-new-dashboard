import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  'Arts', 'Business', 'Comedy', 'Education', 'Fiction', 'Government', 'History',
  'Health & Fitness', 'Kids & Family', 'Leisure', 'Music', 'News', 'Religion & Spirituality',
  'Science', 'Society & Culture', 'Sports', 'Technology', 'True Crime', 'TV & Film',
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function GET() {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('podcast_shows')
      .select('*, podcast_episodes(id, status)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.podcast_shows.list.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { title, description, artwork_url, owner_name, owner_email, category, explicit, language } = body;

    if (!title || !owner_name || !owner_email || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: title, owner_name, owner_email, category' },
        { status: 400 }
      );
    }
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}` }, { status: 400 });
    }

    const baseSlug = slugify(title) || 'show';
    let slug = baseSlug;
    let attempt = 0;
    // Real uniqueness loop, not a hopeful single insert — slug is globally unique across
    // workspaces (it's the public URL segment).
    while (attempt < 20) {
      const { data: existing } = await adminClient.from('podcast_shows').select('id').eq('slug', slug).maybeSingle();
      if (!existing) break;
      attempt += 1;
      slug = `${baseSlug}-${attempt + 1}`;
    }

    const { data, error } = await adminClient
      .from('podcast_shows')
      .insert({
        workspace_id: workspaceId,
        title,
        slug,
        description: description || null,
        artwork_url: artwork_url || null,
        owner_name,
        owner_email,
        category,
        explicit: !!explicit,
        language: language || 'en',
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.podcast_shows.create.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
