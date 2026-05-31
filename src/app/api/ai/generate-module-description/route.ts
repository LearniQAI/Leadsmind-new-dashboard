import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { moduleName, nqfLevel = 'Not Specified', lessons = [] } = body;

    if (!moduleName || typeof moduleName !== 'string' || moduleName.trim() === '') {
      return NextResponse.json({ error: 'Module name is required' }, { status: 400 });
    }

    const systemPrompt = `You are LENA, an AI copywriter fine-tuned for South African corporate communication and education systems.
Generate professional, structured, student-facing summaries for course modules. The tone should be engaging, professional, and clear.
Use natural corporate South African terms where applicable. Avoid fluff. Organize the output with a brief overview, list of key learnings, and who this is for.`;

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey || openAiKey === 'sk_mock_key' || openAiKey.includes('PLACEHOLDER') || openAiKey.startsWith('sk-proj-O15jtbs')) {
      // Mock Sandbox fallbacks for development / testing without OpenAI API keys
      console.log('--- LENA AI MODULE DESCRIPTION GENERATOR - SANDBOX MODE ---');

      const lessonsList = lessons && lessons.length > 0 
        ? lessons.map((l: any) => `- ${typeof l === 'string' ? l : l.title || 'Untitled Lesson'}`).join('\n')
        : '- Core Concepts Overview\n- Practical Case Studies\n- Knowledge Review Assessment';

      const mockResponse = `### Module Overview
Welcome to **${moduleName}**. This module provides a professional-grade dive into key learning parameters, structured to meet standard outcomes at **NQF Level: ${nqfLevel}**.

### 📖 What You Will Learn
${lessonsList}

### 🎯 Who This Is For
Designed for corporate practitioners, student builders, and learning teams aiming to master these skills and apply them immediately in a business context.`;

      return NextResponse.json({ success: true, text: mockResponse });
    }

    // Call OpenAI completion
    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Generate a structured, student-facing module description for: "${moduleName}".
NQF Level: ${nqfLevel}
Lessons included:
${lessons.map((l: any, i: number) => `${i + 1}. ${typeof l === 'string' ? l : l.title || 'Untitled'}`).join('\n')}

Format as readable Markdown.` 
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
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
    console.error('[LENA MODULE DESCRIPTION API ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
