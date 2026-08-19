import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { runCreditGuard, consumeAICredit } from '@/lib/ai/creditGuard';

export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 20 * 1000; // 20s per workspace — short, since this is an iterative creative tool
const SCRIPT_MODEL = 'gpt-4o-mini';

type Platform = 'tiktok' | 'instagram_reels' | 'youtube_shorts';
const VALID_PLATFORMS: Platform[] = ['tiktok', 'instagram_reels', 'youtube_shorts'];

interface GeneratedScript {
  hook: string;
  body_beats: string[];
  cta: string;
}

const PLATFORM_DIRECTIVES: Record<Platform, string> = {
  tiktok:
    'Write for TikTok: the hook must land in the first 1-2 seconds with a scroll-stopping line or bold claim — no slow intros. Pacing is fast and punchy, native platform slang is welcome, body beats should be short (one idea per beat, quick cuts), and the whole script should read like it fits 15-45 seconds spoken aloud. CTA should be casual and native (e.g. follow for more, comment X below), not corporate.',
  instagram_reels:
    'Write for Instagram Reels: the hook should be visually/aesthetically framed (what the viewer will SEE first, not just hear) and land in the first 2-3 seconds. Body beats can breathe slightly more than TikTok but should still move quickly and favor a satisfying, save-or-share-worthy payoff. Aim for roughly 15-60 seconds spoken aloud. CTA should lean into saves/shares/follows.',
  youtube_shorts:
    'Write for YouTube Shorts: the hook should promise a clear payoff or curiosity gap within the first 2-3 seconds. Body beats can be slightly more value-driven/informative than TikTok/Reels since Shorts audiences tolerate a touch more substance, while still staying tight — aim for up to 60 seconds spoken aloud. CTA should point at subscribing or watching a related video.',
};

function buildPrompt(topic: string, platform: Platform, tone?: string) {
  const systemInstructions = [
    'You are a short-form video scriptwriter for LeadsMind, helping South African SMEs script TikTok/Reels/Shorts content.',
    'You write a structured script (hook, body beats, call-to-action) for the given topic and platform, plus a set of relevant hashtags.',
    PLATFORM_DIRECTIVES[platform],
    tone ? `Tone/style requested: ${tone}.` : 'Use a confident, natural, conversational tone.',
    '',
    'IMPORTANT — hashtag honesty: you have no access to live or trending hashtag data. Suggest hashtags based on topic/content relevance only (a mix of broad and niche tags is fine), and never imply they are currently trending or based on real-time data.',
    '',
    'Respond with STRICT JSON ONLY, no markdown, matching exactly this shape:',
    '{"script":{"hook":"...","body_beats":["...","..."],"cta":"..."},"hashtags":["tag1","tag2"]}',
    'hashtags must NOT include the "#" character (the caller adds it). Return 5-10 hashtags. body_beats should have 2-5 entries.',
  ].join('\n');

  const userContext = JSON.stringify({ topic, platform, tone: tone || null }, null, 2);

  return { systemInstructions, userContext };
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const body = await req.json();
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    const platform = body.platform as Platform;
    const tone = typeof body.tone === 'string' && body.tone.trim() ? body.tone.trim() : undefined;

    if (!topic) {
      return NextResponse.json({ error: 'A topic or idea is required.', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform.', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    // 1. Server-side per-workspace cooldown — checked against the last real
    // row in the DB, not a client-supplied flag.
    const { data: lastGen, error: lastError } = await adminClient
      .from('video_script_generations')
      .select('created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;

    if (lastGen) {
      const elapsedMs = Date.now() - new Date(lastGen.created_at).getTime();
      if (elapsedMs < COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        return NextResponse.json(
          {
            error: 'A script was generated moments ago. Please wait before regenerating.',
            code: 'COOLDOWN_ACTIVE',
            retryAfterSeconds,
          },
          { status: 429 }
        );
      }
    }

    // 2. Credit/rate-limit guard, same mechanism as the "Write with AI" feature.
    const guardResult = await runCreditGuard(workspaceId);
    if (guardResult.ok === false) {
      return NextResponse.json(guardResult.body as object, { status: guardResult.status });
    }

    const { systemInstructions, userContext } = buildPrompt(topic, platform, tone);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: SCRIPT_MODEL,
      messages: [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userContext },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const tokensUsed = completion.usage?.total_tokens || 0;

    let parsed: { script?: GeneratedScript; hashtags?: string[] };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      logger.error({ rawContent }, 'video.script.parse.failed');
      return NextResponse.json(
        { error: 'The AI returned an unexpected response. Please try again.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      );
    }

    const script: GeneratedScript = {
      hook: parsed.script?.hook || '',
      body_beats: Array.isArray(parsed.script?.body_beats) ? parsed.script!.body_beats : [],
      cta: parsed.script?.cta || '',
    };
    const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [];

    if (!script.hook || script.body_beats.length === 0 || !script.cta) {
      logger.error({ rawContent }, 'video.script.incomplete');
      return NextResponse.json(
        { error: 'The AI returned an incomplete script. Please try again.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      );
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('video_script_generations')
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        platform,
        input_params: { topic, platform, tone: tone || null },
        generated_script: script,
        generated_hashtags: hashtags,
        model_used: SCRIPT_MODEL,
        tokens_used: tokensUsed,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    await consumeAICredit(workspaceId);

    return NextResponse.json(inserted);
  } catch (error: any) {
    logger.error({ err: error }, 'video.script.generate.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 25);

    const { data, error } = await adminClient
      .from('video_script_generations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return NextResponse.json({ generations: data ?? [] });
  } catch (error: any) {
    logger.error({ err: error }, 'video.script.list.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
