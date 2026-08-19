import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { runCreditGuard, consumeAICredit } from '@/lib/ai/creditGuard';
import { getCampaignById, computeDerivedMetrics, hasSufficientCampaignData } from '@/lib/marketing/campaignMetrics';

export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour, per-campaign
const RECOMMENDATIONS_MODEL = 'gpt-4o-mini';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RecommendationItem {
  priority: number;
  metric: string;
  observation: string;
  recommendation: string;
}

function buildPrompt(campaign: NonNullable<Awaited<ReturnType<typeof getCampaignById>>>, derived: ReturnType<typeof computeDerivedMetrics>) {
  const systemInstructions = [
    'You are a paid-advertising performance analyst for LeadsMind, a South African SME CRM/marketing platform.',
    'You will be given REAL metrics for one ad campaign, plus derived rates (CTR, conversion rate, CPC, CPA) that have already been computed correctly in code — do not recompute or contradict them.',
    'Produce specific, numbered, actionable recommendations grounded in the actual numbers given (e.g. "your CTR of X% is below a typical Y% benchmark for this platform — consider..."). Do not give generic marketing advice that ignores the provided numbers.',
    'Reasonable platform-typical benchmarks may be cited qualitatively (e.g. "typically 1-2% for this platform/objective") but never fabricate a precise external statistic as if it were sourced data.',
    'Each recommendation must be tied to a specific metric from the input.',
    'Respond with STRICT JSON ONLY, no markdown, matching exactly:',
    '{"recommendations":[{"priority":1,"metric":"ctr","observation":"...","recommendation":"..."}]}',
    'priority is a 1-based rank, 1 = most impactful. Include between 2 and 6 recommendations depending on how many metrics are available.',
  ].join('\n');

  const userContext = JSON.stringify(
    {
      campaign: {
        name: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
        budgetDaily: campaign.budget_daily,
        spendToDate: campaign.spend_to_date,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        leadsCreated: campaign.leads_created,
      },
      derivedMetrics: derived,
    },
    null,
    2
  );

  return { systemInstructions, userContext };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: campaignId } = await params;
    const { workspaceId, userId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const campaign = await getCampaignById(workspaceId, campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // 1. Server-side per-campaign cooldown.
    const { data: lastRec, error: lastError } = await adminClient
      .from('campaign_recommendations')
      .select('created_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;

    if (lastRec) {
      const elapsedMs = Date.now() - new Date(lastRec.created_at).getTime();
      if (elapsedMs < COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        return NextResponse.json(
          {
            error: 'Recommendations were generated recently for this campaign. Please wait before regenerating.',
            code: 'COOLDOWN_ACTIVE',
            retryAfterSeconds,
          },
          { status: 429 }
        );
      }
    }

    // 2. Real data sufficiency check.
    if (!hasSufficientCampaignData(campaign)) {
      return NextResponse.json(
        {
          error: 'This campaign has no recorded spend, impressions, or clicks yet. Add real metrics before generating recommendations.',
          code: 'INSUFFICIENT_DATA',
        },
        { status: 422 }
      );
    }

    // 3. Credit/rate-limit guard, same mechanism as the "Write with AI" feature.
    const guardResult = await runCreditGuard(workspaceId);
    if (guardResult.ok === false) {
      return NextResponse.json(guardResult.body as object, { status: guardResult.status });
    }

    const derived = computeDerivedMetrics(campaign);
    const { systemInstructions, userContext } = buildPrompt(campaign, derived);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: RECOMMENDATIONS_MODEL,
      messages: [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userContext },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const tokensUsed = completion.usage?.total_tokens || 0;

    let parsed: { recommendations?: RecommendationItem[] };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      logger.error({ rawContent }, 'campaign.recommendations.parse.failed');
      return NextResponse.json(
        { error: 'The AI returned an unexpected response. Please try again.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      );
    }

    const recommendations = parsed.recommendations ?? [];
    const expiresAt = new Date(Date.now() + COOLDOWN_MS).toISOString();

    const { data: inserted, error: insertError } = await adminClient
      .from('campaign_recommendations')
      .insert({
        workspace_id: workspaceId,
        campaign_id: campaignId,
        requested_by: userId,
        input_metrics_snapshot: { campaign: { ...campaign }, derivedMetrics: derived },
        recommendations,
        model_used: RECOMMENDATIONS_MODEL,
        tokens_used: tokensUsed,
        expires_at: expiresAt,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    await consumeAICredit(workspaceId);

    return NextResponse.json(inserted);
  } catch (error: any) {
    logger.error({ err: error }, 'campaign.recommendations.generate.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: campaignId } = await params;
    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const campaign = await getCampaignById(workspaceId, campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const { data: latest, error } = await adminClient
      .from('campaign_recommendations')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({
      recommendation: latest ?? null,
      campaign,
      derivedMetrics: computeDerivedMetrics(campaign),
      hasEnoughData: hasSufficientCampaignData(campaign),
    });
  } catch (error: any) {
    logger.error({ err: error }, 'campaign.recommendations.get.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
