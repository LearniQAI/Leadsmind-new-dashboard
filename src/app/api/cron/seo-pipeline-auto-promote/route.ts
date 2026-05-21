import { NextResponse } from 'next/server';
import { runPipelineAutomation, runRevenueRollup } from '@/app/actions/seo';

// Mark as dynamic to avoid static generation build failures
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    // Secure authentication check via environment key if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && key !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid cron access key.' }, { status: 401 });
    }

    // 1. Run pipeline auto-promotion logic (moves stages and flags stuck items)
    console.log('[SEO Pipeline Cron] Executing auto promote and stuck flag routine...');
    const promoteResult = await runPipelineAutomation();
    if (promoteResult.error) {
      console.error('[SEO Pipeline Cron] Promotion error:', promoteResult.error);
      return NextResponse.json({ success: false, error: `Promotion failed: ${promoteResult.error}` }, { status: 500 });
    }

    // 2. Run revenue rollup logic (aggregates closed revenue/RPV/ROI)
    console.log('[SEO Pipeline Cron] Executing revenue attribution rollup routine...');
    const rollupResult = await runRevenueRollup();
    if (rollupResult.error) {
      console.error('[SEO Pipeline Cron] Rollup error:', rollupResult.error);
      return NextResponse.json({ success: false, error: `Rollup failed: ${rollupResult.error}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'SEO Content Pipeline automation and Revenue Rollup executed successfully.'
    });
  } catch (error: any) {
    console.error('[SEO Pipeline Cron API] Failed:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
