import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

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
