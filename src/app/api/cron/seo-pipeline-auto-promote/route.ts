import { NextResponse } from 'next/server';
import { runPipelineAutomation, runRevenueRollup } from '@/app/actions/seo';
import { logger } from '@/shared/logger';

// Mark as dynamic to avoid static generation build failures
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Run pipeline auto-promotion logic (moves stages and flags stuck items)
    logger.info({}, 'cron.seo_pipeline_auto_promote.promote.start');
    const promoteResult = await runPipelineAutomation();
    if (promoteResult.error) {
      logger.error({ err: promoteResult.error }, 'cron.seo_pipeline_auto_promote.promote.failed');
      return NextResponse.json({ success: false, error: 'Pipeline promotion failed.' }, { status: 500 });
    }

    // 2. Run revenue rollup logic (aggregates closed revenue/RPV/ROI)
    logger.info({}, 'cron.seo_pipeline_auto_promote.rollup.start');
    const rollupResult = await runRevenueRollup();
    if (rollupResult.error) {
      logger.error({ err: rollupResult.error }, 'cron.seo_pipeline_auto_promote.rollup.failed');
      return NextResponse.json({ success: false, error: 'Revenue rollup failed.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'SEO Content Pipeline automation and Revenue Rollup executed successfully.'
    });
  } catch (error: any) {
    logger.error({ err: error }, 'cron.seo_pipeline_auto_promote.failed');
    return NextResponse.json({ success: false, error: 'SEO pipeline automation failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
