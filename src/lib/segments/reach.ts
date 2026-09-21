// How many of a segment's matching contacts a campaign can actually REACH on each channel.
// A segment's raw match count includes contacts every send path later skips (unsubscribed,
// invalid email, no phone, opted out), so showing it alone overstates the audience.
//
// These predicates mirror the send-time gates — keep them in sync:
//   email     -> suppressionReason() in lib/campaigns/emailSuppression (has email, not
//                is_invalid_email, not in global_suppression_list)
//   SMS       -> bulk_sms.ts resolveAudience (has phone, not sms_opt_out, not opted_out)
//   WhatsApp  -> whatsapp_broadcast.ts resolveAudience (has phone, not opted_out, not sms_opt_out)
import { suppressionReason } from '@/lib/campaigns/emailSuppression';

export interface Reach {
  email: number;
  sms: number;
  whatsapp: number;
}

export function computeReach(contacts: any[], workspaceId: string, suppressed: Set<string>): Reach {
  let email = 0;
  let sms = 0;
  let whatsapp = 0;
  for (const c of contacts) {
    if (!suppressionReason({ email: c.email, is_invalid_email: c.is_invalid_email }, workspaceId, suppressed)) email++;
    if (c.phone && !c.sms_opt_out && !c.opted_out) {
      sms++;
      whatsapp++; // same consent gates as SMS today; kept as two counters so they can diverge
    }
  }
  return { email, sms, whatsapp };
}
