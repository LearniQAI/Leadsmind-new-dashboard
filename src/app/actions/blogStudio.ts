'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';
import { NotFoundError, DatabaseError, toClientError } from '@/shared/errors/AppError';

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// 1. VERSION HISTORY & ROLLBACK
export async function createPostVersion(payload: {
  postId: string;
  title: string;
  bodyHtml: string;
  bodyPlain: string;
  summary: string;
}) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('blog_post_versions').insert({
      post_id: payload.postId,
      title: payload.title,
      body_html: payload.bodyHtml,
      body_plain: payload.bodyPlain,
      summary: payload.summary
    }).select().single();

    if (error) throw error;
    return { data };
  } catch (error: any) {
    logger.error({ err: error, postId: payload.postId }, 'blog_studio.post_version.create.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

export async function getPostVersions(postId: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('blog_post_versions')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data };
  } catch (error: any) {
    logger.error({ err: error, postId }, 'blog_studio.post_versions.fetch.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

export async function rollbackPostVersion(postId: string, versionId: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    
    const supabase = await createServerClient();
    
    // Get version
    const { data: version, error: vErr } = await supabase
      .from('blog_post_versions')
      .select('*')
      .eq("id", versionId)
      .eq("workspace_id", wsId)
      .single();

    if (vErr || !version) throw new NotFoundError('Version');

    // Overwrite post
    const { data: post, error: pErr } = await supabase
      .from('blog_posts')
      .update({
        title: version.title,
        body_html: version.body_html,
        body_plain: version.body_plain,
        summary: version.summary,
        updated_at: new Date().toISOString()
      })
      .eq("id", postId)
      .eq("workspace_id", wsId)
      .select()
      .single();

    if (pErr) throw pErr;
    
    revalidatePath(`/blog/editor/${postId}`);
    return { data: post };
  } catch (error: any) {
    logger.error({ err: error, postId, versionId }, 'blog_studio.post_version.rollback.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

// 2. CLONING MECHANICS
export async function clonePost(postId: string) {
  try {
    const supabase = await createServerClient();
    const { data: original, error: oErr } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (oErr || !original) throw new NotFoundError('Post');

    const randomSlugSuffix = Math.floor(Math.random() * 10000);
    const { author, category, created_at, updated_at, id, ...cloneData } = original;

    const { data: clone, error: cErr } = await supabase
      .from('blog_posts')
      .insert({
        ...cloneData,
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-${randomSlugSuffix}`,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (cErr) throw cErr;

    revalidatePath('/blog/manage');
    return { data: clone };
  } catch (error: any) {
    logger.error({ err: error, postId }, 'blog_studio.post.clone.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

// 3. CONCEPTUAL PROMPT WIZARD ENGINE (AI Brief Writer)
export async function generateAiBriefArticle(payload: {
  keywords: string;
  audienceCategory: string;
  targetLength: 'short' | 'medium' | 'long';
  keyPoints: string;
}) {
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return { error: 'No active workspace context' };
  const user = await getUser();
  if (!user) return { error: 'Unauthorized administrative access' };

  const supabase = await createServerClient();

  // Load Brand Voice & Workspace details
  const { data: ws } = await supabase.from('workspaces').select('name').eq('id', wsId).single();
  const { data: brand } = await supabase.from('workspace_branding').select('*').eq('workspace_id', wsId).single();

  const businessName = ws?.name || 'LeadsMind Hub';
  const industry = (brand as any)?.industry || 'Corporate services & high-growth automation';
  const brandTone = (brand as any)?.brand_tone || 'Professional, authoritative, yet highly engaging';
  const targetAudience = payload.audienceCategory || (brand as any)?.target_audience || 'Entrepreneurs, founders, and marketing managers';

  const lengthRange = payload.targetLength === 'short' ? '600 to 800' : payload.targetLength === 'medium' ? '800 to 1,100' : '1,100 to 1,500';

  try {
    const prompt = `You are a high-level copywriting strategist generating a comprehensive search-optimised article.
Brand Profile Integration:
- Business Name: ${businessName}
- Industry: ${industry}
- Brand Voice Tone: ${brandTone}
- Target Audience Focus: ${targetAudience}

Article Specification parameters:
- Target Word Length: ${lengthRange} words
- Focus Keywords: ${payload.keywords}
- Key Discussion Points to Cover:
"${payload.keyPoints}"

Linguistic Requirement: You MUST write using South African / UK spelling protocols (e.g. colour, organisation, optimised, centre, behaviour, programme).

Output MUST be a strict, valid JSON object matching this structure:
{
  "title": "An optimised UK/South African styled article title reflecting keywords",
  "metaDescription": "SEO Meta description preview under 160 characters",
  "introduction": "An engaging, comprehensive introduction paragraph integrating the business branding context",
  "sections": [
    {
      "heading": "Heading Title (H2 level)",
      "content": "Deep, rich, multi-paragraph content discussing this concept in depth, satisfying keywords"
    }
  ],
  "conclusion": "A compelling conclusion summarizing final highlights and including a subtle CTA matching tone"
}`;

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
      logger.error({ errText, workspaceId: wsId }, 'blog_studio.ai_brief.openai_request.failed');
      throw new DatabaseError('AI brief generation failed. Please try again.');
    }

    const result = await response.json();
    const blog = JSON.parse(result.choices[0].message.content);

    // Build content body
    const postBodyHtml = `
      <p>${blog.introduction || ''}</p>
      ${(blog.sections || []).map((s: any) => `<h2>${s.heading}</h2><p>${s.content}</p>`).join('\n')}
      <h2>Conclusion</h2>
      <p>${blog.conclusion || ''}</p>
    `;

    const postBodyPlain = `${blog.introduction || ''}\n\n${(blog.sections || []).map((s: any) => `${s.heading}\n${s.content}`).join('\n\n')}\n\nConclusion\n${blog.conclusion || ''}`;

    const slug = `ai-brief-${Math.floor(Math.random() * 100000)}`;

    const { data: post, error: pErr } = await supabase.from('blog_posts').insert({
      workspace_id: wsId,
      author_id: user.id,
      title: blog.title || 'AI Generated Article',
      slug,
      summary: blog.metaDescription || 'AI Brief draft content.',
      body_html: postBodyHtml,
      body_plain: postBodyPlain,
      status: 'draft',
      seo_title: blog.title || 'AI Generated Article',
      target_keyword: payload.keywords.split(',')[0]?.trim() || 'optimised'
    }).select().single();

    if (pErr) {
      logger.error({ err: pErr, workspaceId: wsId }, 'blog_studio.ai_brief.draft_save.failed');
      throw new DatabaseError('Failed to save the generated draft.');
    }

    revalidatePath('/blog');
    revalidatePath('/blog/manage');

    return { data: { postId: post.id } };

  } catch (err: any) {
    logger.error({ err, workspaceId: wsId }, 'blog_studio.ai_brief.generate.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}

// 4. INLINE AI COPILOT ENGINE
export async function inlineAiEdit(payload: {
  text: string;
  action: 'elaborate' | 'condense' | 'tone-professional' | 'tone-casual' | 'tone-empathetic' | 'tone-analytical' | 'south-africanize' | 'continue';
}) {
  try {
    let prompt = '';
    
    switch (payload.action) {
      case 'elaborate':
        prompt = `Elaborate and expand this sentence/paragraph into a deep, informative, and rich copy block. Preserve the key details: "${payload.text}"`;
        break;
      case 'condense':
        prompt = `Shorten and condense this text to be tight, succinct, fast-reading, and punchy. Remove fluff: "${payload.text}"`;
        break;
      case 'tone-professional':
        prompt = `Rewrite this text in a highly professional, authoritative, and corporate executive tone: "${payload.text}"`;
        break;
      case 'tone-casual':
        prompt = `Rewrite this text in a friendly, conversational, engaging, and casual everyday tone: "${payload.text}"`;
        break;
      case 'tone-empathetic':
        prompt = `Rewrite this text in a highly warm, supportive, and empathetic tone that builds deep trust: "${payload.text}"`;
        break;
      case 'tone-analytical':
        prompt = `Rewrite this text in a highly analytical, data-driven, objective, and logical tone: "${payload.text}"`;
        break;
      case 'south-africanize':
        prompt = `Rewrite this text adopting UK/South African spelling rules (e.g. colour, organisation, optimised). Contextually integrate typical South African business aspects (e.g., SARS tax compliance, BEE, local markets) naturally where appropriate: "${payload.text}"`;
        break;
      case 'continue':
        prompt = `You are a blog co-writer. Seamlesly generate the next logical paragraph that directly follows this content context. Maintain the established tone and flow perfectly: "${payload.text}"`;
        break;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an elite copywriting assistant. Return ONLY the newly drafted copy, with no surrounding quotes, introductions, conversational chatter, or explanations.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ errText, action: payload.action }, 'blog_studio.inline_ai.openai_request.failed');
      throw new DatabaseError('Inline AI processing failed.');
    }

    const result = await response.json();
    const formattedText = result.choices[0].message.content.trim();

    return { data: formattedText };

  } catch (error: any) {
    logger.error({ err: error, action: payload.action }, 'blog_studio.inline_ai.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

