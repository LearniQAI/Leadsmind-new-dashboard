// Types for the WhatsApp broadcast audience resolver. Pure (no server imports) so client components can
// import them. The resolver itself lives in resolveBroadcastAudience.ts and must only run on the server.
import type { RuleGroup } from '@/lib/intelligence/SegmentationCompiler';

/** Filters over columns that exist on `contacts` (verified against the live schema). */
export type ContactFieldFilter =
  // Only `true` is offered: contacts with no phone number can never receive a WhatsApp message.
  | { field: 'has_phone'; value: true }
  | { field: 'source'; value: string }
  | { field: 'timezone'; value: string }
  | { field: 'created_after'; value: string }
  | { field: 'created_before'; value: string };

export type AudienceSource =
  | { type: 'all_contacts' }
  | { type: 'tags'; tags: string[]; mode: 'all' | 'any' }
  | { type: 'contact_fields'; filters: ContactFieldFilter[] }
  // OPTIONAL source: reads a saved segment, never writes or edits one.
  | { type: 'saved_segment'; segmentId: string }
  // Ad-hoc rules, only reachable through the legacy `ruleGroup` input of createWhatsAppBroadcastCampaign.
  | { type: 'rule_group'; ruleGroup: RuleGroup };

/** One source, or several that are INTERSECTED (the legacy "rules/segment AND tags" behaviour). */
export type AudienceSpec = AudienceSource | AudienceSource[];

export interface AudienceExclusions {
  no_phone: number;
  invalid_number: number;
  opted_out: number;
  suppressed: number;
  duplicate_phone: number;
}

export interface MaskedSample {
  /** First name only, or "(no name)". */
  name: string;
  /** "***" + last 3 digits of the E.164 number. Never the full number. */
  phone: string;
}

export interface ResolvedAudience {
  contactIds: string[];
  counts: { matched: number; eligible: number };
  exclusions: AudienceExclusions;
  sample: MaskedSample[];
}

export const AUDIENCE_TYPES = ['all_contacts', 'tags', 'contact_fields', 'saved_segment'] as const;
export type AudienceType = (typeof AUDIENCE_TYPES)[number];

/** The audience a UI form submits. `rule_group` is intentionally not offered here. */
export type BroadcastAudienceInput =
  | { type: 'all_contacts' }
  | { type: 'tags'; tags: string[]; mode?: 'all' | 'any' }
  | { type: 'contact_fields'; filters: ContactFieldFilter[] }
  | { type: 'saved_segment'; segmentId: string };

export const COMPLIANCE_TEXT_VERSION = 'wa-attest-v1';
export const COMPLIANCE_TEXT =
  'I confirm these contacts agreed to receive WhatsApp marketing messages from my business';
export const WHATSAPP_ATTESTATION_REQUIRED_MESSAGE =
  'Confirm that these contacts agreed to receive WhatsApp marketing messages before creating a campaign.';
