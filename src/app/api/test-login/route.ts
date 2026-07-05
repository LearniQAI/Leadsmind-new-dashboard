import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, getCurrentWorkspace, getUserAccessInfo } from '@/lib/auth';

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

  console.log('[DEBUG ROUTE] Invoking layout functions...');
  
  try {
    const profile = await getCurrentProfile(authUser);
    console.log('[DEBUG ROUTE] Profile fetched:', profile);

    const workspace = await getCurrentWorkspace(authUser);
    console.log('[DEBUG ROUTE] Workspace fetched:', workspace);

    const accessInfo = await getUserAccessInfo();
    console.log('[DEBUG ROUTE] Access info fetched:', accessInfo);

    return NextResponse.json({
      success: true,
      profile,
      workspace,
      accessInfo
    });
  } catch (err: any) {
    console.error('[DEBUG ROUTE] Error caught during execution:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
