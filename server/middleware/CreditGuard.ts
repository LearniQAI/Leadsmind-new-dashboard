import { Request, Response, NextFunction } from 'express';
import { db } from '../database/datasource';

export async function verifyAICreditBalance(req: Request, res: Response, next: NextFunction) {
  // If request has JSON body or searchParams, get workspaceId
  const workspaceId = req.body?.workspaceId || req.query?.workspaceId;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Missing workspaceId in request' });
  }

  let usageRecord = await db('ai_usage_credits').where({ workspace_id: workspaceId }).first();

  if (!usageRecord) {
    // Auto-initialize standard credit account for backwards compatibility
    await db('ai_usage_credits').insert({
      workspace_id: workspaceId,
      plan_monthly_credits: 500,
      credits_used_this_period: 0,
      credits_purchased_addon: 0
    });
    usageRecord = await db('ai_usage_credits').where({ workspace_id: workspaceId }).first();
    
    if (!usageRecord) {
      return res.status(403).json({ error: 'CREDIT_ACCOUNT_NOT_INITIALIZED' });
    }
  }

  const absoluteCeiling = usageRecord.plan_monthly_credits + usageRecord.credits_purchased_addon;
  const currentUsage = usageRecord.credits_used_this_period;

  // 1. Throttling Guard Layer (100% depletion blocking)
  if (currentUsage >= absoluteCeiling) {
    return res.status(402).json({
      error: 'CREDIT_LIMIT_EXCEEDED',
      message: 'Your workspace has exhausted its assigned monthly AI credits. Upgrade your account or purchase a top-up bundle.'
    });
  }

  // 2. Automated Usage Threshold Checker (80% warning trigger)
  const usageRatio = currentUsage / absoluteCeiling;
  if (usageRatio >= 0.8 && !usageRecord.last_notification_sent_at) {
    try {
      // Find workspace admins to notify
      const admins = await db('workspace_members')
        .where({ workspace_id: workspaceId });

      for (const admin of admins) {
        await db('crm_notifications').insert({
          workspace_id: workspaceId,
          user_id: admin.user_id,
          title: 'AI Credits Warning',
          message: `Your workspace has consumed ${Math.round(usageRatio * 100)}% of its assigned AI credits.`,
          type: 'alert',
          is_read: false
        });
      }

      // Mark notification sent to prevent duplicate alerts on subsequent actions
      await db('ai_usage_credits')
        .where({ workspace_id: workspaceId })
        .update({ last_notification_sent_at: new Date().toISOString() });
      
      console.log(`[CreditGuard] 80% usage threshold alert triggered for workspace ${workspaceId}`);
    } catch (err: any) {
      console.error('[CreditGuard] Failed to trigger threshold alert:', err.message);
    }
  }

  next();
}
