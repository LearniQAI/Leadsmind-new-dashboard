import { NextRequest, NextResponse } from 'next/server';
import { verifyAICreditBalance } from '@/server/middleware/CreditGuard';
import { PromptEngine } from '@/server/services/ai/PromptEngine';
import { db } from '@/server/database/datasource';
import OpenAI from 'openai';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { toClientError } from '@/shared/errors/AppError';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Resolves the real, session-active workspace (the same active_workspace_id cookie +
    // membership convention used everywhere else in this app) and real auth in one call —
    // replaces the previous silent try/catch-and-ignore that let an unauthenticated caller
    // proceed anyway (with a client-supplied workspaceId) whenever CreditGuard happened to
    // pass for that id. A bare first-found workspace_members row (no cookie/ordering) was
    // tried first and rejected: it picks an arbitrary one of the caller's own workspaces for
    // multi-workspace users instead of the one they actually have active.
    const { userId, workspaceId: realWorkspaceId } = await requireWorkspaceRole();
    const teamMemberId = userId;

    const body = await req.json();
    const { contextType, userBrief, toneOverride } = body;

    if (!userBrief) {
      return NextResponse.json({ error: 'Missing required parameter: userBrief' }, { status: 400 });
    }

    // 1. Run CreditGuard middleware via wrapper
    let nextCalled = false;
    let responseStatus = 200;
    let responseData: any = null;

    const mockReq: any = { body: { workspaceId: realWorkspaceId } };
    const mockRes: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        return this;
      }
    };
    const mockNext = () => {
      nextCalled = true;
    };

    await verifyAICreditBalance(mockReq, mockRes, mockNext);

    if (!nextCalled) {
      return NextResponse.json(responseData || { error: 'Unauthorized credit state' }, { status: responseStatus });
    }

    // 3. Resolve context directives and model selection
    let directive = '';
    let targetModel = 'gpt-4o-mini'; // Default fast model

    if (contextType === 'blog_post') {
      targetModel = 'gpt-4o'; // Long-form deep logic model
      directive = 'Generate an SEO-optimized blog layout structure including semantic metadata, proper structural <H2> headings, clear alt image placeholders, and a concise introductory call-to-action block.';
    } else if (contextType === 'email_campaign') {
      directive = 'Formulate 5 distinct high-converting subject line permutations leveraging deep psychological anchors (Urgency, Curiosity, Incentivization). Provide matching preview headers and structural body prose arrays.';
    } else if (contextType === 'social_post') {
      directive = 'Produce multi-channel variations optimized for LinkedIn (structural layout with clean spacing), Instagram (engaging hook spacing), and Twitter (hard character limits under 280 tokens).';
    } else {
      directive = 'Generate short, direct, punchy, conversational outreach copy.';
    }

    // 4. Load Workspace Brand Voice
    const voiceRecord = await db('workspace_brand_voice').where({ workspace_id: realWorkspaceId }).first();
    const voiceContext = voiceRecord ? {
      name: voiceRecord.business_name,
      industry: voiceRecord.industry,
      servicesDescription: voiceRecord.services_description,
      targetAudience: voiceRecord.target_audience,
      brandPersonality: toneOverride || voiceRecord.brand_personality,
      toneAdjectives: voiceRecord.tone_adjectives || [],
      wordsToUse: voiceRecord.words_to_use || [],
      wordsToAvoid: voiceRecord.words_to_avoid || [],
      primaryLanguage: voiceRecord.primary_language || 'en'
    } : {
      name: 'The Company',
      industry: 'General Business',
      servicesDescription: 'Professional Services',
      targetAudience: 'General Audience',
      brandPersonality: toneOverride || 'Professional and clear',
      toneAdjectives: ['clear', 'concise'],
      wordsToUse: [],
      wordsToAvoid: [],
      primaryLanguage: 'en'
    };

    // 5. Build system prompt & user prompts via PromptEngine
    const payload = PromptEngine.buildPayload(voiceContext, directive, userBrief);

    // 6. Invoke OpenAI chat completion
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: targetModel,
      messages: [
        { role: 'system', content: payload.systemInstructions },
        { role: 'user', content: payload.userContext }
      ],
      temperature: 0.7
    });

    const generatedText = completion.choices[0].message.content || '';
    const tokensConsumed = completion.usage?.total_tokens || 0;

    // 7. Log Generation Analytics Audit
    await db('ai_generations').insert({
      workspace_id: realWorkspaceId,
      team_member_id: teamMemberId,
      generation_type: contextType || 'sms',
      user_brief: userBrief,
      model_used: targetModel,
      tokens_used: tokensConsumed,
      output_content: generatedText
    });

    // 8. Deduct Credit Ledger Balance
    await db('ai_usage_credits')
      .where({ workspace_id: realWorkspaceId })
      .increment('credits_used_this_period', 1);

    // 9. Return JSON payload
    return NextResponse.json({ content: generatedText, tokensUsed: tokensConsumed });

  } catch (error: any) {
    console.error('[Generate Content API] Exception:', error.message);
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
