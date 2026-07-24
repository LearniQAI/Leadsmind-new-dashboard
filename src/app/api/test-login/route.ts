import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Dev-only convenience login for local testing. Previously this accepted an arbitrary
// client-supplied userId/email and forged a session-shaped object for it, returning that
// user's real profile/workspace/access-info data to anyone — a full impersonation backdoor
// with no auth of any kind. Fixed to: (1) 404 in every environment except local development,
// and (2) never accept a client-supplied identity at all — it only ever signs in as one
// fixed, pre-seeded test account via a real Supabase signInWithPassword call, establishing a
// genuine session rather than forging one.
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const testEmail = process.env.TEST_EMAIL;
  const testPassword = process.env.TEST_PASSWORD;
  if (!testEmail || !testPassword) {
    throw new Error('[FATAL] TEST_EMAIL/TEST_PASSWORD env vars are not configured for dev test-login');
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (error || !data.session) {
      logger.error({ err: error }, 'test_login.sign_in.failed');
      return NextResponse.json({ error: 'Dev test-login failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: data.user.id, email: data.user.email });
  } catch (err: any) {
    logger.error({ err }, 'test_login.execution.failed');
    return NextResponse.json({ error: 'Dev test-login failed' }, { status: 500 });
  }
}
