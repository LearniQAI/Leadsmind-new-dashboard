'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ZAR_EXCHANGE_RATE = 18.5;

export async function expandSocialPostToBlog(payload: {
  sourceText: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'whatsapp';
  sourceUrl?: string;
}) {
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return { error: 'No active workspace context' };
  const user = await getUser();
  if (!user) return { error: 'Unauthorized administrative access' };

  const supabase = await createServerClient();

  // 1. Staging initial job log
  const { data: job, error: jErr } = await supabase.from('blog_social_imports').insert({
    workspace_id: wsId,
    import_type: 'social',
    source_url: payload.sourceUrl || null,
    original_text: payload.sourceText,
    status: 'queued'
  }).select().single();

  if (jErr) {
    logger.error({ err: jErr, workspaceId: wsId }, 'social_import.job.queue.failed');
    return { error: 'Failed to queue social import job.' };
  }

  try {
    // Update state to processing
    await supabase.from('blog_social_imports').update({ status: 'processing', updated_at: new Date().toISOString() }).eq("id", job.id).eq("workspace_id", wsId).eq('workspace_id', wsId);

    const prompt = `You are an elite research blogger. Expand the following short social media post from ${payload.platform} into a highly engaging, professional informational article of 800 to 1,200 words.
Preserve all key concepts, facts, and underlying claims of the source text, but enrich them with thorough explanations, case analyses, and strategic summaries.

Linguistic Standard: You MUST write using South African / UK spelling protocols (e.g. colour, organisation, optimised, centre, behaviour, programme).

Output MUST be a strict, valid JSON object with the following structure:
{
  "title": "An optimised UK/South African styled article title",
  "metaDescription": "SEO Meta description preview under 160 characters",
  "introduction": "An engaging, comprehensive introduction paragraph expanding on the social blurb",
  "sections": [
    {
      "heading": "Heading Title (H2 level)",
      "content": "Deep, rich, multi-paragraph content discussing this concept in depth"
    }
  ],
  "conclusion": "A compelling conclusion summarizing final highlights"
}

Social post source text:
"${payload.sourceText}"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You only output strict JSON based on context.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ errText, workspaceId: wsId }, 'social_import.openai_expansion.request_failed');
      throw new Error('AI expansion request failed.');
    }

    const result = await response.json();
    const parsedBlog = JSON.parse(result.choices[0].message.content);

    // Build Post content
    const postBodyHtml = `
      <p>${parsedBlog.introduction || ''}</p>
      ${(parsedBlog.sections || []).map((s: any) => `<h2>${s.heading}</h2><p>${s.content}</p>`).join('\n')}
      <h2>Conclusion</h2>
      <p>${parsedBlog.conclusion || ''}</p>
    `;

    const postBodyPlain = `${parsedBlog.introduction || ''}\n\n${(parsedBlog.sections || []).map((s: any) => `${s.heading}\n${s.content}`).join('\n\n')}\n\nConclusion\n${parsedBlog.conclusion || ''}`;

    const slug = `social-${payload.platform}-${Math.floor(Math.random() * 10000)}`;

    // Create Draft Blog Post
    const { data: post, error: pErr } = await supabase.from('blog_posts').insert({
      workspace_id: wsId,
      author_id: user.id,
      title: parsedBlog.title || `Expanded ${payload.platform} Article`,
      slug,
      summary: parsedBlog.metaDescription || `Expanded informational post based on ${payload.platform} caption.`,
      body_html: postBodyHtml,
      body_plain: postBodyPlain,
      status: 'draft',
      seo_title: parsedBlog.title || `Expanded ${payload.platform} Article`,
      target_keyword: 'optimised'
    }).select().single();

    if (pErr) {
      logger.error({ err: pErr, workspaceId: wsId }, 'social_import.draft_post.publish_failed');
      throw new Error('Failed to publish draft post.');
    }

    // Update job log to completed
    await supabase.from('blog_social_imports').update({
      status: 'completed',
      post_id: post.id,
      updated_at: new Date().toISOString()
    }).eq("id", job.id).eq("workspace_id", wsId).eq('workspace_id', wsId);

    revalidatePath('/blog');
    revalidatePath('/blog/manage');

    return { data: { postId: post.id } };

  } catch (err: any) {
    logger.error({ err, workspaceId: wsId, jobId: job.id }, 'social_import.expansion.failed');
    await supabase.from('blog_social_imports').update({
      status: 'failed',
      error_message: err.message || 'Expansion orchestration pipeline failure.',
      updated_at: new Date().toISOString()
    }).eq("id", job.id).eq("workspace_id", wsId).eq('workspace_id', wsId);

    return { error: 'Social expansion pipeline aborted.' };
  }
}

export async function getVoiceNoteRecords() {
  let wsId: string | null = null;
  try {
    wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('blog_social_imports')
      .select(`
        id,
        workspace_id,
        import_type,
        source_url,
        original_text,
        status,
        error_message,
        post_id,
        created_at,
        updated_at,
        team_members:users (
          id,
          email,
          first_name,
          last_name,
          full_name,
          profile_photo_url,
          avatar_preset_id,
          job_title,
          phone
        )
      `)
      .eq('workspace_id', wsId)
      .eq('import_type', 'voice')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [] };
  } catch (err: any) {
    logger.error({ err, workspaceId: wsId }, 'social_import.voice_notes.fetch.failed');
    return { error: 'Fetch voice notes failed' };
  }
}
