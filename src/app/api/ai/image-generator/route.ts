import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { runCreditGuard, consumeAICredit } from '@/lib/ai/creditGuard';

export const dynamic = 'force-dynamic';
// Image generation genuinely takes 10-30+s (real, synchronous OpenAI Images
// API call, not job/polling-based) — extend past Next's default route
// timeout, same pattern already used by /api/pdf and the KYC report route
// for other slow, real-work endpoints.
export const maxDuration = 60;

const COOLDOWN_MS = 60 * 1000; // 60s per workspace — image gen costs ~10x a text call and takes far longer, so a short 20s cooldown (used by the text generators) isn't appropriate here.
const IMAGE_MODEL = 'gpt-image-2';
const IMAGE_CREDIT_COST = 10; // reflects gpt-image-2's real ~10x cost vs a single gpt-4o-mini text generation at medium quality

type AspectRatio = 'square' | 'portrait' | 'landscape';
const SIZE_MAP: Record<AspectRatio, '1024x1024' | '1024x1536' | '1536x1024'> = {
  square: '1024x1024',
  portrait: '1024x1536',
  landscape: '1536x1024',
};
const VALID_ASPECT_RATIOS: AspectRatio[] = ['square', 'portrait', 'landscape'];

const STYLE_MODIFIERS: Record<string, string> = {
  photorealistic: 'Photorealistic, natural lighting, high detail.',
  illustration: 'Flat vector illustration style, clean shapes, limited color palette.',
  minimal: 'Minimalist graphic design, lots of negative space, simple geometric shapes.',
  bold: 'Bold, high-contrast marketing graphic style, vivid colors, strong focal point.',
};

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const body = await req.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const aspectRatio = body.aspectRatio as AspectRatio;
    const style = typeof body.style === 'string' && body.style.trim() ? body.style.trim() : undefined;

    if (!prompt) {
      return NextResponse.json({ error: 'Describe the image you want first.', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    if (!VALID_ASPECT_RATIOS.includes(aspectRatio)) {
      return NextResponse.json({ error: 'Invalid aspect ratio.', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    // 1. Server-side per-workspace cooldown.
    const { data: lastGen, error: lastError } = await adminClient
      .from('ai_image_generations')
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
            error: 'An image was generated moments ago. Please wait before regenerating.',
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

    const styleModifier = style && STYLE_MODIFIERS[style] ? STYLE_MODIFIERS[style] : '';
    const finalPrompt = styleModifier ? `${prompt}\n\n${styleModifier}` : prompt;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 55 * 1000 });

    let imageResult;
    try {
      imageResult = await openai.images.generate({
        model: IMAGE_MODEL,
        prompt: finalPrompt,
        size: SIZE_MAP[aspectRatio],
        quality: 'medium',
        n: 1,
      });
    } catch (genError: any) {
      // Surface the real reason (content-policy rejection, timeout, rate limit)
      // rather than a generic message — these are all real, distinct failure
      // modes for image generation specifically.
      logger.error({ err: genError }, 'ai.image.generate.api_call_failed');
      const code = genError?.code || genError?.error?.code;
      if (code === 'content_policy_violation' || code === 'moderation_blocked') {
        return NextResponse.json(
          { error: 'This request was rejected by content-safety review. Try rephrasing the description.', code: 'CONTENT_POLICY_VIOLATION' },
          { status: 400 }
        );
      }
      if (genError?.status === 429) {
        return NextResponse.json(
          { error: 'The image generation service is rate-limited right now. Please try again shortly.', code: 'PROVIDER_RATE_LIMITED' },
          { status: 429 }
        );
      }
      throw genError;
    }

    const b64 = imageResult.data?.[0]?.b64_json;
    if (!b64) {
      logger.error({ imageResult }, 'ai.image.generate.no_image_data');
      return NextResponse.json(
        { error: 'The AI did not return an image. Please try again.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      );
    }

    const imageBuffer = Buffer.from(b64, 'base64');
    const randomId = Math.floor(Math.random() * 1000000);
    const storagePath = `${workspaceId}/${Date.now()}-${randomId}.png`;

    const { error: uploadError } = await adminClient.storage
      .from('ai-generated-media')
      .upload(storagePath, imageBuffer, {
        cacheControl: '31536000, public',
        contentType: 'image/png',
        upsert: false,
      });
    if (uploadError) {
      logger.error({ err: uploadError }, 'ai.image.upload_failed');
      return NextResponse.json(
        { error: 'The image was generated but could not be saved. Please try again.', code: 'STORAGE_UPLOAD_FAILED' },
        { status: 502 }
      );
    }

    const { data: publicUrlData } = adminClient.storage.from('ai-generated-media').getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    // Never claim success without confirming the file is genuinely retrievable
    // from Storage — an upload call returning "no error" isn't proof of that.
    try {
      const verifyRes = await fetch(publicUrl, { method: 'HEAD' });
      if (!verifyRes.ok) {
        throw new Error(`Verification fetch returned ${verifyRes.status}`);
      }
    } catch (verifyError) {
      logger.error({ err: verifyError, publicUrl }, 'ai.image.verify_failed');
      return NextResponse.json(
        { error: 'The image was uploaded but is not yet retrievable. Please try again.', code: 'STORAGE_VERIFY_FAILED' },
        { status: 502 }
      );
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('ai_image_generations')
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        prompt,
        style_params: { aspectRatio, style: style || null },
        storage_path: storagePath,
        public_url: publicUrl,
        status: 'completed',
        model_used: IMAGE_MODEL,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    await consumeAICredit(workspaceId, IMAGE_CREDIT_COST);

    return NextResponse.json(inserted);
  } catch (error: any) {
    logger.error({ err: error }, 'ai.image.generate.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 12, 1), 50);

    const { data, error } = await adminClient
      .from('ai_image_generations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return NextResponse.json({ generations: data ?? [] });
  } catch (error: any) {
    logger.error({ err: error }, 'ai.image.list.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
