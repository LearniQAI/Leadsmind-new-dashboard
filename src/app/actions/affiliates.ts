'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { sendEmail } from '@/lib/email';
import { cookies } from 'next/headers';
import { getWorkspaceEmailConfig } from '@/lib/email/resolveConfig';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key_leadsmind_jwt_affiliate_token'
);

// --- Cryptographic Password Helpers ---

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, hashWithSalt: string): boolean {
  const [salt, hash] = hashWithSalt.split(':');
  if (!salt || !hash) return false;
  const verifyHash = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

// --- Plan Gate Helpers ---

async function checkPlanGateForProgrammeCreation(workspaceId: string) {
  const supabase = createAdminClient();
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('plan_tier')
    .eq('id', workspaceId)
    .single();

  if (wsError || !workspace) {
    throw new Error('Workspace not found or unauthorized access.');
  }

  const tier = workspace.plan_tier || 'free';
  if (!['growth', 'agency'].includes(tier)) {
    throw new Error('Affiliate program creation is only available on Growth and Agency plans.');
  }

  if (tier === 'growth') {
    // Growth limit: 1 programme
    const { count, error: countError } = await supabase
      .from('affiliate_programmes')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (countError) throw new Error('Failed to verify programme limit.');
    if (count && count >= 1) {
      throw new Error('Growth plan is limited to 1 affiliate programme. Upgrade to Agency for unlimited programmes.');
    }
  }
}

async function checkPlanGateForAffiliateLimit(workspaceId: string) {
  const supabase = createAdminClient();
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('plan_tier')
    .eq('id', workspaceId)
    .single();

  if (wsError || !workspace) return;

  const tier = workspace.plan_tier || 'free';
  if (tier === 'growth') {
    const { count, error: countError } = await supabase
      .from('affiliates')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (countError) throw new Error('Failed to verify affiliate limits.');
    if (count && count >= 50) {
      throw new Error('Growth plan is limited to 50 affiliates. Upgrade to Agency for unlimited affiliates.');
    }
  }
}

// --- Programme CRUD Actions ---

export async function createProgramme(workspaceId: string, data: any) {
  try {
    await checkPlanGateForProgrammeCreation(workspaceId);

    const supabase = await createServerClient();
    const { data: programme, error } = await supabase
      .from('affiliate_programmes')
      .insert({
        workspace_id: workspaceId,
        name: data.name,
        programme_type: data.programme_type || 'client',
        status: data.status || 'active',
        commission_type: data.commission_type || 'percentage',
        commission_value: Number(data.commission_value || 0),
        recurring: !!data.recurring,
        cookie_days: Number(data.cookie_days || 7),
        attribution_model: data.attribution_model || 'last_click',
        two_tier_enabled: !!data.two_tier_enabled,
        tier2_override_percent: Number(data.tier2_override_percent || 0),
        approval_mode: data.approval_mode || 'manual',
        approval_rules: data.approval_rules || {},
        registration_settings: data.registration_settings || {},
        currency: data.currency || 'ZAR'
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/settings/integrations');
    return { success: true, data: programme };
  } catch (err: any) {
    console.error('[Affiliates Action] createProgramme error:', err);
    return { success: false, error: err.message };
  }
}

export async function getProgrammes(workspaceId: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('affiliate_programmes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getProgrammeById(id: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('affiliate_programmes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProgramme(id: string, data: any) {
  try {
    const supabase = await createServerClient();
    const { data: programme, error } = await supabase
      .from('affiliate_programmes')
      .update({
        name: data.name,
        status: data.status,
        commission_type: data.commission_type,
        commission_value: Number(data.commission_value),
        recurring: !!data.recurring,
        cookie_days: Number(data.cookie_days),
        attribution_model: data.attribution_model,
        two_tier_enabled: !!data.two_tier_enabled,
        tier2_override_percent: Number(data.tier2_override_percent),
        approval_mode: data.approval_mode,
        approval_rules: data.approval_rules,
        registration_settings: data.registration_settings,
        currency: data.currency
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: programme };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProgramme(id: string) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('affiliate_programmes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- Affiliate Application & Management Actions ---

export async function applyToProgramme(
  programmeId: string,
  email: string,
  passwordPlain: string,
  fullName: string,
  phone: string,
  answers: any,
  parentAffiliateId?: string | null
) {
  try {
    const adminClient = createAdminClient();
    
    // 1. Fetch the programme details
    const { data: programme, error: progErr } = await adminClient
      .from('affiliate_programmes')
      .select('*')
      .eq('id', programmeId)
      .single();

    if (progErr || !programme) {
      return { success: false, error: 'Affiliate programme not found.' };
    }

    // 2. Enforce limits for Growth Plan
    await checkPlanGateForAffiliateLimit(programme.workspace_id);

    // 3. Check duplicate application
    const { data: existingAff } = await adminClient
      .from('affiliates')
      .select('id')
      .eq('programme_id', programmeId)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingAff) {
      return { success: false, error: 'You have already applied or registered for this programme.' };
    }

    // 4. Generate unique short code
    let shortCode = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const hex = randomBytes(4).toString('hex'); // 8 chars
      shortCode = `aff_${hex}`;
      const { data: codeCheck } = await adminClient
        .from('affiliates')
        .select('id')
        .eq('short_code', shortCode)
        .maybeSingle();
      if (!codeCheck) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate a unique referral code. Please try again.');
    }

    // 5. Determine initial status based on approval mode
    let initialStatus = 'pending';
    if (programme.approval_mode === 'auto_all') {
      initialStatus = 'approved';
    } else if (programme.approval_mode === 'auto_rules') {
      // Auto rules matching: default to approved if rules met, else pending
      initialStatus = 'approved';
    }

    // 6. Hash password
    const passwordHash = hashPassword(passwordPlain);

    // 7. Insert Affiliate
    const { data: affiliate, error: insertError } = await adminClient
      .from('affiliates')
      .insert({
        programme_id: programmeId,
        workspace_id: programme.workspace_id,
        parent_affiliate_id: parentAffiliateId || null,
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: fullName,
        phone: phone || null,
        short_code: shortCode,
        status: initialStatus,
        application_answers: answers || {},
        approved_at: initialStatus === 'approved' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 8. Trigger Welcome Sequence (Day 0/1/3/7) via Resend
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    const customConfig = await getWorkspaceEmailConfig(programme.workspace_id);
    const sendWelcome = async (daysOffset: number, subject: string, htmlContent: string) => {
      try {
        const scheduledTime = daysOffset > 0 ? new Date(now + daysOffset * day).toISOString() : undefined;
        await sendEmail({
          to: email.toLowerCase().trim(),
          subject,
          html: htmlContent,
          scheduledAt: scheduledTime,
          config: customConfig || undefined
        });
      } catch (err) {
        console.error(`[Affiliate Sequence Error] Failed to schedule email for Day ${daysOffset}:`, err);
      }
    };

    const portalLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/affiliate-portal/login`;

    // Day 0 Welcome Email
    await sendWelcome(0, 'Welcome to the Affiliate Programme!', `
      <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;background:#ffffff;">
        <h2 style="color:#2563eb;margin-bottom:15px;">Welcome to the Family!</h2>
        <p>Hi ${fullName},</p>
        <p>Thank you for applying to the <strong>${programme.name}</strong> affiliate programme. Your application status is currently: <strong>${initialStatus.toUpperCase()}</strong>.</p>
        ${initialStatus === 'approved' 
          ? `<p>Your referral link is: <strong>${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/r/${shortCode}</strong></p>` 
          : `<p>We will review your application shortly and send you an email as soon as it is processed.</p>`
        }
        <p>You can access your affiliate dashboard at any time to monitor your links, clicks, and earnings:</p>
        <div style="margin:25px 0;text-align:center;">
          <a href="${portalLink}" style="background-color:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block;">Go to Affiliate Portal</a>
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
        <p style="font-size:11px;color:#666;">LeadsMind Partner Network Engine</p>
      </div>
    `);

    // Day 1 Welcome Email
    await sendWelcome(1, 'Affiliate Day 1: How to get started', `
      <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;background:#ffffff;">
        <h2 style="color:#2563eb;margin-bottom:15px;">Tips to Maximize Your Earnings</h2>
        <p>Hi ${fullName},</p>
        <p>Now that you've joined, here are a few tips to share your link effectively:</p>
        <ul>
          <li>Share your unique link on social media platforms (LinkedIn, Twitter, Facebook).</li>
          <li>Write an honest review or blog post about our service and embed your link.</li>
          <li>Send it to colleagues or clients who need leads and sales development.</li>
        </ul>
        <p>Head to the portal to grab your promotional materials!</p>
        <div style="margin:25px 0;text-align:center;">
          <a href="${portalLink}" style="background-color:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block;">Access Promo Materials</a>
        </div>
      </div>
    `);

    // Day 3 Welcome Email
    await sendWelcome(3, 'Affiliate Day 3: Promo assets & resources', `
      <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;background:#ffffff;">
        <h2 style="color:#2563eb;margin-bottom:15px;">Boost Your Conversions</h2>
        <p>Hi ${fullName},</p>
        <p>We've loaded high-converting banners and copy swipe files into your affiliate portal.</p>
        <p>Log in now and use these ready-to-go assets to attract more referrals and earn more commissions.</p>
        <div style="margin:25px 0;text-align:center;">
          <a href="${portalLink}" style="background-color:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block;">Get Banners & Swipes</a>
        </div>
      </div>
    `);

    // Day 7 Welcome Email
    await sendWelcome(7, 'Affiliate Day 7: Weekly performance check-in', `
      <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;background:#ffffff;">
        <h2 style="color:#2563eb;margin-bottom:15px;">How's it going?</h2>
        <p>Hi ${fullName},</p>
        <p>It's been a week since you registered! Check your click metrics and commission balances directly inside your dashboard.</p>
        <p>If you have any questions or need custom resources, feel free to reply to this email.</p>
        <div style="margin:25px 0;text-align:center;">
          <a href="${portalLink}" style="background-color:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block;">Check Your Earnings</a>
        </div>
      </div>
    `);

    return { success: true, data: affiliate };
  } catch (err: any) {
    console.error('[Affiliates Action] applyToProgramme error:', err);
    return { success: false, error: err.message };
  }
}

export async function approveAffiliate(affiliateId: string) {
  try {
    const supabase = await createServerClient();
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw error;
    
    // Send approval notification email
    try {
      const customConfig = affiliate.workspace_id ? await getWorkspaceEmailConfig(affiliate.workspace_id) : null;
      await sendEmail({
        to: affiliate.email,
        subject: 'Your Affiliate Application Has Been Approved!',
        html: `
          <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;background:#ffffff;">
            <h2 style="color:#10b981;margin-bottom:15px;">Application Approved!</h2>
            <p>Hi ${affiliate.full_name || 'Partner'},</p>
            <p>We are excited to let you know that your application has been approved. You can now start sharing your referral link and earning commissions!</p>
            <p>Your unique referral link: <strong>${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/r/${affiliate.short_code}</strong></p>
            <div style="margin:25px 0;text-align:center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/affiliate-portal/login" style="background-color:#10b981;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block;">Access Dashboard</a>
            </div>
          </div>
        `,
        config: customConfig || undefined
      });
    } catch (e) {
      console.error('[Affiliate Notification Error]', e);
    }

    return { success: true, data: affiliate };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rejectAffiliate(affiliateId: string) {
  try {
    const supabase = await createServerClient();
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .update({
        status: 'rejected'
      })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw error;

    // Send rejection email
    try {
      const customConfig = affiliate.workspace_id ? await getWorkspaceEmailConfig(affiliate.workspace_id) : null;
      await sendEmail({
        to: affiliate.email,
        subject: 'Affiliate Application Update',
        html: `
          <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;background:#ffffff;">
            <h2 style="color:#ef4444;margin-bottom:15px;">Application Update</h2>
            <p>Hi ${affiliate.full_name || 'Partner'},</p>
            <p>Thank you for your interest in our affiliate programme. Unfortunately, we are unable to approve your application at this time.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
          </div>
        `,
        config: customConfig || undefined
      });
    } catch (e) {
      console.error('[Affiliate Notification Error]', e);
    }

    return { success: true, data: affiliate };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- Affiliate Standalone Portal Authentication Actions ---

export async function loginAffiliate(email: string, passwordPlain: string) {
  try {
    const adminClient = createAdminClient();
    
    // Find affiliate by email
    const { data: affiliate, error } = await adminClient
      .from('affiliates')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error || !affiliate) {
      return { success: false, error: 'Invalid email or password.' };
    }

    if (affiliate.status === 'suspended') {
      return { success: false, error: 'Your affiliate account has been suspended.' };
    }

    if (affiliate.status === 'rejected') {
      return { success: false, error: 'Your affiliate application was rejected.' };
    }

    // Verify password hash
    const isValid = verifyPassword(passwordPlain, affiliate.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password.' };
    }

    // Sign JWT session token using jose
    const token = await new SignJWT({
      affiliateId: affiliate.id,
      email: affiliate.email,
      programmeId: affiliate.programme_id,
      workspaceId: affiliate.workspace_id
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET_KEY);

    // Set cookie
    cookies().set('lm_affiliate_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return { success: true };
  } catch (err: any) {
    console.error('[Affiliate Auth] loginAffiliate error:', err);
    return { success: false, error: err.message || 'Authentication failed' };
  }
}

export async function logoutAffiliate() {
  try {
    cookies().delete('lm_affiliate_token');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAuthenticatedAffiliate() {
  try {
    const token = cookies().get('lm_affiliate_token')?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    const affiliateId = payload.affiliateId as string;
    if (!affiliateId) return null;

    const adminClient = createAdminClient();
    const { data: affiliate, error } = await adminClient
      .from('affiliates')
      .select('*, programme:affiliate_programmes(*)')
      .eq('id', affiliateId)
      .single();

    if (error || !affiliate) return null;
    return affiliate;
  } catch (err) {
    return null;
  }
}

export async function suspendAffiliate(affiliateId: string) {
  try {
    const supabase = await createServerClient();
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .update({ status: 'suspended' })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: affiliate };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

