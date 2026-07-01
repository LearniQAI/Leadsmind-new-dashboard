import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { getWorkspaceEmailConfig } from '@/lib/email/resolveConfig';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Query pending emails ready to send
  const { data: queueItems, error: fetchError } = await supabase
    .from('affiliate_email_queue')
    .select('*, affiliate:affiliates(*, programme:affiliate_programmes(*))')
    .eq('status', 'pending')
    .lte('send_at', now)
    .limit(50); // limit batch to 50 at a time to prevent timeout

  if (fetchError) {
    console.error('Error fetching affiliate email queue:', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const processedCount = { sent: 0, failed: 0 };

  for (const item of queueItems || []) {
    const affiliate = item.affiliate;
    if (!affiliate || affiliate.status !== 'approved') {
      // If affiliate was suspended/rejected or deleted, mark as failed and skip
      await supabase
        .from('affiliate_email_queue')
        .update({ status: 'failed' })
        .eq('id', item.id);
      processedCount.failed++;
      continue;
    }

    let subject = '';
    let htmlContent = '';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadsmind.io';
    const referralLink = `${appUrl}/r/${affiliate.short_code}`;
    const portalLink = `${appUrl}/affiliate-portal`;

    if (item.email_type === 'day1') {
      subject = 'Day 1: Access your promotional banners & swipe content';
      htmlContent = `
        <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;background:#ffffff;">
          <h2 style="color:#3b82f6;margin-bottom:15px;">Your Promotional Creatives are Ready!</h2>
          <p>Hi ${affiliate.full_name || 'Partner'},</p>
          <p>Great news! Your affiliate materials, links, and banners are available in your portal. You can start sharing them today to drive signups.</p>
          <p><strong>Your Referral Link:</strong> <a href="${referralLink}" style="color:#3b82f6;">${referralLink}</a></p>
          <p style="margin-top:20px;">
            <a href="${portalLink}" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Go to Affiliate Dashboard</a>
          </p>
          <p style="margin-top:20px;font-size:12px;color:#777;">Thank you for partnering with us!</p>
        </div>
      `;
    } else if (item.email_type === 'day3') {
      subject = 'Day 3: Top tips for maximizing your referral conversions';
      htmlContent = `
        <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;background:#ffffff;">
          <h2 style="color:#f59e0b;margin-bottom:15px;">Maximize Your Referral Earnings</h2>
          <p>Hi ${affiliate.full_name || 'Partner'},</p>
          <p>Here are 3 quick tips to help you get more clicks and conversions on your referral link:</p>
          <ul style="padding-left:20px;">
            <li><strong>Share on Social Media:</strong> LinkedIn and Facebook work exceptionally well for professional sales tools.</li>
            <li><strong>Include in Email Newsletters:</strong> Mention our program to your list or clients who need customer acquisition platforms.</li>
            <li><strong>Add a banner:</strong> Log into your dashboard to grab visual banners you can display on your website/blog.</li>
          </ul>
          <p style="margin-top:20px;">
            <a href="${portalLink}" style="display:inline-block;padding:10px 20px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Sign In to Portal</a>
          </p>
          <p style="margin-top:20px;font-size:12px;color:#777;">Let's make this partnership a success!</p>
        </div>
      `;
    } else if (item.email_type === 'day7') {
      subject = "Day 7: Let's get your first referral commission!";
      htmlContent = `
        <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;background:#ffffff;">
          <h2 style="color:#10b981;margin-bottom:15px;">Need any help or custom assets?</h2>
          <p>Hi ${affiliate.full_name || 'Partner'},</p>
          <p>It's been a week since your partner account was approved. We are fully committed to helping you earn your first payouts.</p>
          <p>If you need custom banners, coupon codes, or specific promotional assets, please reply to this email! We are happy to help accommodate you.</p>
          <p>Keep sharing your link: <a href="${referralLink}" style="color:#10b981;">${referralLink}</a></p>
          <p style="margin-top:20px;font-size:12px;color:#777;">Warm regards,</p>
          <p style="font-weight:bold;font-size:14px;color:#333;margin:0;">The Partner Support Team</p>
        </div>
      `;
    } else {
      // Unknown email type
      await supabase
        .from('affiliate_email_queue')
        .update({ status: 'failed' })
        .eq('id', item.id);
      processedCount.failed++;
      continue;
    }

    try {
      // Resolve custom workspace configuration
      const customConfig = affiliate.workspace_id 
        ? await getWorkspaceEmailConfig(affiliate.workspace_id) 
        : null;

      await sendEmail({
        to: affiliate.email,
        subject,
        html: htmlContent,
        config: customConfig || undefined
      });

      // Mark as sent
      await supabase
        .from('affiliate_email_queue')
        .update({ status: 'sent' })
        .eq('id', item.id);
      processedCount.sent++;
    } catch (sendErr) {
      console.error(`Failed to send onboarding email ${item.id}:`, sendErr);
      await supabase
        .from('affiliate_email_queue')
        .update({ status: 'failed' })
        .eq('id', item.id);
      processedCount.failed++;
    }
  }

  return NextResponse.json({ success: true, processedCount });
}
