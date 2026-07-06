import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, getCurrentWorkspace, getUserAccessInfo } from '@/lib/auth';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  if (!userId || !email) {
    return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
  }

  const authUser = {
    id: userId,
    email: email,
    user_metadata: {
      full_name: 'Test User'
    }
  };

  logger.info({}, 'test_login.layout_functions.invoking');

  try {
    const profile = await getCurrentProfile(authUser);
    logger.info({ profile }, 'test_login.profile.fetched');

    const workspace = await getCurrentWorkspace(authUser);
    logger.info({ workspace }, 'test_login.workspace.fetched');

    const accessInfo = await getUserAccessInfo();
    logger.info({ accessInfo }, 'test_login.access_info.fetched');

    return NextResponse.json({
      success: true,
      profile,
      workspace,
      accessInfo
    });
  } catch (err: any) {
    logger.error({ err }, 'test_login.execution.failed');
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
