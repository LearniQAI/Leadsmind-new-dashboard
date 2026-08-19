import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { runCreditGuard, consumeAICredit } from '@/lib/ai/creditGuard';

export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 20 * 1000; // 20s per workspace — matches the video-script generator's cooldown, another iterative creative tool
const COPY_MODEL = 'gpt-4o-mini';

interface CopySection {
  heading: string;
  body: string;
}

interface GeneratedCopy {
  headline: string;
  subheadline: string;
  sections: CopySection[];
  cta: string;
}

// Explicit ban list — landing-page copy is exactly the kind of content that
// reads as templated/AI-generic if the model is left to its own defaults.
// Naming the clichés directly (rather than a vague "be original" instruction)
// measurably reduces their occurrence in practice.
const BANNED_PHRASES = [
  'unlock your potential', 'take your business to the next level', 'revolutionize the way',
  'in today\'s fast-paced world', 'game-changing', 'game changer', 'seamless experience',
  'seamlessly', 'elevate your', 'unleash', 'empower you to', 'cutting-edge', 'state-of-the-art',
  'world-class', 'best-in-class', 'look no further', 'imagine a world where', 'say goodbye to',
  'whether you\'re a', 'in a world where', 'transform the way',
];

function buildPrompt(product: string, audience: string, benefit: string, tone?: string) {
  const systemInstructions = [
    'You are a direct-response landing page copywriter for LeadsMind, writing for South African SMEs.',
    'Write structured landing-page copy for the SPECIFIC product/service, audience, and benefit given — every line must be traceable to something the user actually said, not a generic paraphrase of it.',
    '',
    'STRICT ANTI-GENERIC RULES:',
    `- Never use any of these clichéd phrases or close variants of them: ${BANNED_PHRASES.map(p => `"${p}"`).join(', ')}.`,
    '- Do not write copy so generic it could apply to almost any product by swapping one noun — every sentence should only make sense for THIS specific product/audience/benefit.',
    '- Prefer concrete, specific claims over vague superlatives ("saves 4 hours a week on invoicing" beats "boosts productivity").',
    '- The headline must lead with the benefit, not the product category or a hype adjective.',
    '- Body sections must each cover a genuinely distinct angle (a specific feature, a specific outcome, a specific objection handled, social proof framing, etc.) — do not repeat the same claim reworded across sections.',
    '',
    tone ? `Tone/style requested: ${tone}.` : 'Use a confident, plain-spoken, specific tone — no hype.',
    '',
    'Respond with STRICT JSON ONLY, no markdown, matching exactly this shape:',
    '{"headline":"...","subheadline":"...","sections":[{"heading":"...","body":"..."}],"cta":"..."}',
    'Provide 2-4 sections. headline should be short (under ~12 words). subheadline expands on the headline in one sentence. Each section heading is a short sub-heading (3-6 words); body is 1-3 sentences of specific, concrete supporting copy. cta is a short, specific action line (not just "Sign up now").',
  ].join('\n');

  const userContext = JSON.stringify({ product, audience, benefit, tone: tone || null }, null, 2);

  return { systemInstructions, userContext };
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const body = await req.json();
    const product = typeof body.product === 'string' ? body.product.trim() : '';
    const audience = typeof body.audience === 'string' ? body.audience.trim() : '';
    const benefit = typeof body.benefit === 'string' ? body.benefit.trim() : '';
    const tone = typeof body.tone === 'string' && body.tone.trim() ? body.tone.trim() : undefined;

    if (!product || !audience || !benefit) {
      return NextResponse.json(
        { error: 'Product/service, target audience, and key benefit are all required.', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // 1. Server-side per-workspace cooldown.
    const { data: lastGen, error: lastError } = await adminClient
      .from('landing_page_copy_generations')
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
            error: 'Copy was generated moments ago. Please wait before regenerating.',
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

    const { systemInstructions, userContext } = buildPrompt(product, audience, benefit, tone);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: COPY_MODEL,
      messages: [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userContext },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const tokensUsed = completion.usage?.total_tokens || 0;

    let parsed: Partial<GeneratedCopy>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      logger.error({ rawContent }, 'landing.copy.parse.failed');
      return NextResponse.json(
        { error: 'The AI returned an unexpected response. Please try again.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      );
    }

    const copy: GeneratedCopy = {
      headline: parsed.headline || '',
      subheadline: parsed.subheadline || '',
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      cta: parsed.cta || '',
    };

    if (!copy.headline || !copy.subheadline || copy.sections.length === 0 || !copy.cta) {
      logger.error({ rawContent }, 'landing.copy.incomplete');
      return NextResponse.json(
        { error: 'The AI returned incomplete copy. Please try again.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      );
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('landing_page_copy_generations')
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        input_params: { product, audience, benefit, tone: tone || null },
        generated_copy: copy,
        model_used: COPY_MODEL,
        tokens_used: tokensUsed,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    await consumeAICredit(workspaceId);

    return NextResponse.json(inserted);
  } catch (error: any) {
    logger.error({ err: error }, 'landing.copy.generate.failed');
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
      .from('landing_page_copy_generations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return NextResponse.json({ generations: data ?? [] });
  } catch (error: any) {
    logger.error({ err: error }, 'landing.copy.list.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
