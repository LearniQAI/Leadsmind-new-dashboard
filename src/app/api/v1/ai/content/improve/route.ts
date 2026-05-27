import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetText, operationType, regionalLanguageTarget } = body;

    if (!targetText) {
      return NextResponse.json({ error: 'Missing required field: targetText' }, { status: 400 });
    }

    const operationalDirectives: Record<string, string> = {
      shorten: 'Condense the provided text by 40% to 50%, removing filler and passive phrasing while keeping all core facts intact.',
      lengthen: 'Expand on the concepts in the provided text by adding illustrative details and clear structural logic flows without adding generic fluff.',
      readability: 'Simplify sentence structure and clear out dense corporate jargon to ensure the copy is easy to read and understand.',
      persuade: 'Rewrite the content using a strict Problem-Agitation-Solution copy framework to emphasize value propositions and strengthen call-to-action hooks.'
    };

    let systemMessage = operationalDirectives[operationType] || 'Refine and optimize this text for professional use.';

    if (operationType === 'translate' && regionalLanguageTarget) {
      systemMessage = `Translate the provided text directly into ${regionalLanguageTarget}. Maintain natural phrasing, context, and tone instead of performing a rigid literal translation.`;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: targetText }
      ],
      temperature: 0.3
    });

    const resultText = response.choices[0].message.content || '';
    return NextResponse.json({ improvedContent: resultText });

  } catch (err: any) {
    console.error('[Content Improve API] Exception:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
