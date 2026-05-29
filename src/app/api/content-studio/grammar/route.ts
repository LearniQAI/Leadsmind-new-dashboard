import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, language = 'en-ZA' } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', language);
    params.append('disabledRules', 'WHITESPACE_RULE');

    const ltResponse = await fetch('https://languagetool.leadsmind.io/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!ltResponse.ok) {
      const errorText = await ltResponse.text();
      return NextResponse.json({ 
        error: `LanguageTool internal check failed: ${ltResponse.status} ${errorText}` 
      }, { status: ltResponse.status });
    }

    const data = await ltResponse.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
