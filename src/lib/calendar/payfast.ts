import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

interface PayFastParams {
  merchantId: string;
  merchantKey: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  amount: number;
  itemName: string;
  paymentId: string; // Lease ID
  firstName: string;
  lastName: string;
  email: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  custom_str4?: string;
}

/**
 * Creates a temporary booking lease (5-minute optimistic hold) for a calendar slot.
 * Ensures slot is not already held or confirmed.
 */
export async function createTemporaryBookingLease(
  calendarId: string,
  slotTime: string,
  contactId: string,
  workspaceId: string
): Promise<{ success: boolean; leaseId?: string; error?: string }> {
  const supabase = createAdminClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minute hold

  // 1. Check for any active lease (holding and not expired, or confirmed) for this slot
  const { data: existingLeases } = await supabase
    .from('booking_leases')
    .select('*')
    .eq('calendar_id', calendarId)
    .eq('slot_time', slotTime)
    .or(`status.eq.confirmed,and(status.eq.holding,expires_at.gt.${now.toISOString()})`);

  if (existingLeases && existingLeases.length > 0) {
    return { success: false, error: 'This slot is temporarily held or already booked. Please choose another.' };
  }

  // 2. Insert the lease hold
  const { data: lease, error } = await supabase
    .from('booking_leases')
    .insert({
      workspace_id: workspaceId,
      calendar_id: calendarId,
      slot_time: slotTime,
      expires_at: expiresAt.toISOString(),
      status: 'holding',
      contact_id: contactId,
    })
    .select()
    .single();

  if (error || !lease) {
    return { success: false, error: 'Failed to establish lease lock' };
  }

  return { success: true, leaseId: lease.id };
}

/**
 * Builds the URL and parameters for redirecting the user to PayFast.
 */
export function generatePayFastCheckoutUrl(params: PayFastParams): string {
  const merchantId = params.merchantId || process.env.PAYFAST_MERCHANT_ID || '10000100'; // Default sandbox ID
  const merchantKey = params.merchantKey || process.env.PAYFAST_MERCHANT_KEY || '46f0z550522ac';
  
  const payload: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    name_first: params.firstName,
    name_last: params.lastName,
    email_address: params.email,
    m_payment_id: params.paymentId,
    amount: params.amount.toFixed(2),
    item_name: params.itemName,
  };

  if (params.custom_str1) payload.custom_str1 = params.custom_str1;
  if (params.custom_str2) payload.custom_str2 = params.custom_str2;
  if (params.custom_str3) payload.custom_str3 = params.custom_str3;
  if (params.custom_str4) payload.custom_str4 = params.custom_str4;


  // Generate MD5 Signature
  let paramString = '';
  Object.keys(payload).forEach(key => {
    paramString += `${key}=${encodeURIComponent(payload[key].trim()).replace(/%20/g, '+')}&`;
  });
  paramString = paramString.slice(0, -1); // remove last &

  const signature = crypto.createHash('md5').update(paramString).digest('hex');
  
  const baseUrl = process.env.PAYFAST_URL || 'https://sandbox.payfast.co.za/eng/process';
  
  const queryParams = new URLSearchParams({
    ...payload,
    signature,
  });

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Validates the MD5 signature from a PayFast ITN webhook payload.
 *
 * Signature verification is mandatory — a missing or incorrect `signature` field is always
 * rejected, never silently skipped. PayFast's documented ITN algorithm requires the fields to
 * stay in the order they were POSTed (never re-sorted alphabetically), and the passphrase
 * (when configured on the merchant account, as it is here) must be appended before hashing —
 * both of these were previously broken across the two PayFast webhook implementations in this
 * codebase, which would have caused genuine PayFast ITN calls to fail verification once made
 * mandatory without also fixing the hash construction.
 */
export function verifyPayFastSignature(body: Record<string, string>, passphrase: string): boolean {
  const pfSignature = body.signature;
  if (!pfSignature) return false;

  const keys = Object.keys(body).filter(key => key !== 'signature');
  const paramString = keys
    .map(key => `${key}=${encodeURIComponent(String(body[key]).trim()).replace(/%20/g, '+')}`)
    .join('&');

  const strToHash = `${paramString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`;
  const calculatedSignature = crypto.createHash('md5').update(strToHash).digest('hex');

  const providedBuf = Buffer.from(pfSignature, 'hex');
  const calculatedBuf = Buffer.from(calculatedSignature, 'hex');
  if (providedBuf.length !== calculatedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, calculatedBuf);
}
