import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey || openAiKey === 'sk_mock_key' || openAiKey.includes('PLACEHOLDER') || openAiKey.startsWith('sk-proj-O15jtbs')) {
      // Mock fallback
      const mockText = `This module is designed to provide you with the fundamental skills and insights needed to master these concepts. Through step-by-step guidance and practical assessments, you will learn to execute workflows with precision. Start your learning journey today and elevate your professional capabilities!`;
      return NextResponse.json({ success: true, text: mockText });
    }

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are LENA, an educational assistant. Write motivating, friendly descriptions.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API communication error: ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.choices[0]?.message?.content || "Could not generate description.";

    return NextResponse.json({ success: true, text: resultText });
  } catch (err: any) {
    logger.error({ err }, 'ai.generate.failed');
    return NextResponse.json({ error: 'Failed to generate description.' }, { status: 500 });
  }
}
