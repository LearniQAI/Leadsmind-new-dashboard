import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { runCreditGuard, consumeAICredit } from '@/lib/ai/creditGuard';

export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 20 * 1000; // 20s per workspace — same as the video-script/landing-copy generators
const COPY_MODEL = 'gpt-4o-mini';

type Platform = 'facebook' | 'google' | 'linkedin';
const VALID_PLATFORMS: Platform[] = ['facebook', 'google', 'linkedin'];

// Real current field limits (verified against each platform's live ad specs,
// not assumed from training data — these shift over time):
// - Google RSA: headlines 30 chars (up to 15 slots, min 3); descriptions 90
//   chars (up to 4 slots, min 2). https://support.google.com/google-ads/answer/7684791
// - Meta: primary text truncates ~125 chars before "See More"; headline is a
//   hard 40-char field limit; link description is a hard 30-char field limit.
// - LinkedIn: intro text field allows 600 chars but truncates hard around
//   150 on desktop; headline is a genuine hard 70-char limit (rejected past
//   that at submit); description field is 100 chars.
const LIMITS = {
  google: { headline: 30, description: 90 },
  facebook: { primaryText: 125, headline: 40, description: 30 },
  linkedin: { introText: 150, headline: 70, description: 100 },
} as const;

const GOOGLE_HEADLINE_COUNT = 5;
const GOOGLE_DESCRIPTION_COUNT = 3;
const FACEBOOK_HEADLINE_COUNT = 3;
const LINKEDIN_HEADLINE_COUNT = 3;

interface CopyField {
  text: string;
  charCount: number;
  limit: number;
  truncated: boolean;
}

// Real server-side validation — never just trust the model's output length.
// Truncates at a word boundary (not mid-word) when the model overshoots, and
// always reports whether that happened rather than silently rewriting it.
function makeField(rawText: string, limit: number): CopyField {
  const text = (rawText || '').trim();
  if (text.length <= limit) {
    return { text, charCount: text.length, limit, truncated: false };
  }
  const hardCut = text.slice(0, limit);
  const lastSpace = hardCut.lastIndexOf(' ');
  const safeCut = lastSpace > limit * 0.6 ? hardCut.slice(0, lastSpace) : hardCut;
  const truncatedText = safeCut.trim();
  return { text: truncatedText, charCount: truncatedText.length, limit, truncated: true };
}

const BANNED_PHRASES = [
  'unlock your potential', 'take your business to the next level', 'revolutionize the way',
  'in today\'s fast-paced world', 'game-changing', 'seamless experience', 'elevate your',
  'unleash', 'cutting-edge', 'state-of-the-art', 'world-class', 'best-in-class',
  'look no further', 'don\'t miss out', 'limited time only', 'click here now',
  'best deal ever', 'you need this', 'this one trick', 'act now', 'hurry',
];

function buildPrompt(platform: Platform, product: string, audience: string, benefit: string, tone?: string) {
  const commonRules = [
    'You are a direct-response ad copywriter for LeadsMind, writing for South African SMEs.',
    'Write ad copy for the SPECIFIC product/service, audience, and benefit given — every line must be traceable to what the user actually said, not a generic paraphrase.',
    '',
    'STRICT ANTI-GENERIC RULES:',
    `- Never use any of these clichéd phrases or close variants: ${BANNED_PHRASES.map(p => `"${p}"`).join(', ')}.`,
    '- Prefer concrete, specific claims over vague superlatives ("saves 4 hours a week" beats "boosts productivity").',
    '- Copy must only make sense for THIS specific product/audience/benefit, not swappable to any other product.',
    tone ? `Tone/style requested: ${tone}.` : 'Use a confident, specific tone appropriate for the platform.',
  ];

  let platformRules: string[];
  let schemaLine: string;

  if (platform === 'google') {
    platformRules = [
      `Write for Google Search Ads (responsive search ads). Generate exactly ${GOOGLE_HEADLINE_COUNT} distinct headline variants, each under ${LIMITS.google.headline} characters (aim for 24-28 to leave safety margin) — each should lead with a different angle (benefit, offer, urgency-free specificity, audience call-out, differentiator), not reworded repeats of each other.`,
      `Generate exactly ${GOOGLE_DESCRIPTION_COUNT} distinct description variants, each under ${LIMITS.google.description} characters (aim for 80-85), each covering a different supporting detail.`,
      'Google Ads copy is terse and keyword-relevant — no filler words, get straight to the specific value.',
    ];
    schemaLine = `{"headlines":["...","...","...","...","..."],"descriptions":["...","...","..."]}`;
  } else if (platform === 'facebook') {
    platformRules = [
      `Write for Facebook/Instagram feed ads. Primary text under ${LIMITS.facebook.primaryText} characters (this is what shows before "See More" on mobile — the specific hook and benefit must land before that cutoff).`,
      `Generate exactly ${FACEBOOK_HEADLINE_COUNT} distinct headline variants, each under ${LIMITS.facebook.headline} characters (aim for 27 or under for best Feed display).`,
      `Description (link description) under ${LIMITS.facebook.description} characters — a short supporting line, only shown in some placements so it should stand alone.`,
      'Conversational, scroll-stopping tone appropriate for a social feed, not a billboard.',
    ];
    schemaLine = `{"primaryText":"...","headlines":["...","...","..."],"description":"..."}`;
  } else {
    platformRules = [
      `Write for LinkedIn Sponsored Content ads. Intro text should land its point within roughly ${LIMITS.linkedin.introText} characters (LinkedIn truncates hard around there on desktop before "…see more").`,
      `Generate exactly ${LINKEDIN_HEADLINE_COUNT} distinct headline variants, each under ${LIMITS.linkedin.headline} characters — LinkedIn has a genuine hard cutoff here, so stay well under, not right at the edge.`,
      `Description under ${LIMITS.linkedin.description} characters.`,
      'Professional, B2B-appropriate tone — LinkedIn audiences expect substance over hype, even more so than other platforms.',
    ];
    schemaLine = `{"introText":"...","headlines":["...","...","..."],"description":"..."}`;
  }

  const systemInstructions = [
    ...commonRules,
    '',
    ...platformRules,
    '',
    'Respond with STRICT JSON ONLY, no markdown, matching exactly this shape:',
    schemaLine,
  ].join('\n');

  const userContext = JSON.stringify({ product, audience, benefit, platform, tone: tone || null }, null, 2);

  return { systemInstructions, userContext };
}

interface GoogleCopy {
  headlines: CopyField[];
  descriptions: CopyField[];
}
interface FacebookCopy {
  primaryText: CopyField;
  headlines: CopyField[];
  description: CopyField;
}
interface LinkedInCopy {
  introText: CopyField;
  headlines: CopyField[];
  description: CopyField;
}

function validateAndBuildCopy(platform: Platform, parsed: any): GoogleCopy | FacebookCopy | LinkedInCopy | null {
  if (platform === 'google') {
    const headlines: string[] = Array.isArray(parsed.headlines) ? parsed.headlines : [];
    const descriptions: string[] = Array.isArray(parsed.descriptions) ? parsed.descriptions : [];
    if (headlines.length === 0 || descriptions.length === 0) return null;
    return {
      headlines: headlines.map((h: string) => makeField(h, LIMITS.google.headline)),
      descriptions: descriptions.map((d: string) => makeField(d, LIMITS.google.description)),
    };
  }
  if (platform === 'facebook') {
    if (!parsed.primaryText || !Array.isArray(parsed.headlines) || parsed.headlines.length === 0 || !parsed.description) return null;
    return {
      primaryText: makeField(parsed.primaryText, LIMITS.facebook.primaryText),
      headlines: parsed.headlines.map((h: string) => makeField(h, LIMITS.facebook.headline)),
      description: makeField(parsed.description, LIMITS.facebook.description),
    };
  }
  // linkedin
  if (!parsed.introText || !Array.isArray(parsed.headlines) || parsed.headlines.length === 0 || !parsed.description) return null;
  return {
    introText: makeField(parsed.introText, LIMITS.linkedin.introText),
    headlines: parsed.headlines.map((h: string) => makeField(h, LIMITS.linkedin.headline)),
    description: makeField(parsed.description, LIMITS.linkedin.description),
  };
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
    const platform = body.platform as Platform;
    const campaignId = typeof body.campaignId === 'string' && body.campaignId ? body.campaignId : null;

    if (!product || !audience || !benefit) {
      return NextResponse.json(
        { error: 'Product/service, target audience, and key benefit are all required.', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform.', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    if (campaignId) {
      const { data: campaign, error: campaignError } = await adminClient
        .from('ad_campaigns')
        .select('id')
        .eq('id', campaignId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (campaignError) throw campaignError;
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found', code: 'NOT_FOUND' }, { status: 404 });
      }
    }

    // 1. Server-side per-workspace cooldown.
    const { data: lastGen, error: lastError } = await adminClient
      .from('ad_copy_generations')
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
            error: 'Ad copy was generated moments ago. Please wait before regenerating.',
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

    const { systemInstructions, userContext } = buildPrompt(platform, product, audience, benefit, tone);

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

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      logger.error({ rawContent }, 'ad.copy.parse.failed');
      return NextResponse.json(
        { error: 'The AI returned an unexpected response. Please try again.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      );
    }

    // 3. Real validation of the model's actual output — never just trust the
    // requested length. Every field is measured and truncated-if-needed here.
    const copy = validateAndBuildCopy(platform, parsed);
    if (!copy) {
      logger.error({ rawContent }, 'ad.copy.incomplete');
      return NextResponse.json(
        { error: 'The AI returned incomplete ad copy. Please try again.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      );
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('ad_copy_generations')
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        campaign_id: campaignId,
        platform,
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
    logger.error({ err: error }, 'ad.copy.generate.failed');
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
    const campaignId = searchParams.get('campaignId');

    let query = adminClient
      .from('ad_copy_generations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ generations: data ?? [] });
  } catch (error: any) {
    logger.error({ err: error }, 'ad.copy.list.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
