// Independent audience resolver for WhatsApp broadcasts (Batch B1a).
//
// SERVER-ONLY by design: it takes a Supabase client (user session or admin) and is only called from server
// actions. Workspace-scoped, performs NO writes, and FAILS CLOSED: any lookup error throws, it never returns a
// partial or widened audience.
//
// Segments are an OPTIONAL source. The saved_segment / rule_group sources call exactly the read-only functions the
// campaign action called before this file existed (loadSegmentRuleGroup, validateRuleGroup,
// SegmentationCompiler.executeSegment) and edit nothing. Tags reuse resolveContactIdsWithAllTags; 'any' is local.
import { SegmentationCompiler, type RuleGroup } from '@/lib/intelligence/SegmentationCompiler';
import { validateRuleGroup } from '@/lib/segments/ruleValidation';
import { loadSegmentRuleGroup } from '@/lib/segments/resolveSegment';
import { resolveContactIdsWithAllTags, resolveTagIds } from '@/lib/tagAudience';
import { ValidationError } from '@/shared/errors/AppError';
import type {
  AudienceSource, AudienceSpec, ContactFieldFilter, ResolvedAudience, AudienceExclusions, MaskedSample, BroadcastAudienceInput,
} from './types';
import { AUDIENCE_TYPES } from './types';

// PostgREST puts `.in('id', [...])` in the URL; a URL over ~12-16k characters is rejected. Chunk id lists.
const ID_CHUNK = 100;
const PAGE = 1000;

type Db = any;

export interface LegacyAudienceInput {
  segmentId?: string | null;
  ruleGroup?: RuleGroup | null;
  tags?: string[] | null;
}

/**
 * Maps the pre-B1a inputs onto sources with the SAME semantics: a non-empty ruleGroup wins over segmentId; the
 * rule/segment result is intersected with ALL listed tags. Returns null when none of the three was supplied.
 */
export function audienceFromLegacy(input: LegacyAudienceInput): AudienceSource[] | null {
  const out: AudienceSource[] = [];
  const hasRules = !!input.ruleGroup && Array.isArray(input.ruleGroup.rules) && input.ruleGroup.rules.length > 0;
  if (hasRules) out.push({ type: 'rule_group', ruleGroup: input.ruleGroup as RuleGroup });
  else if (input.segmentId) out.push({ type: 'saved_segment', segmentId: input.segmentId });
  const tags = (input.tags ?? []).filter(Boolean);
  if (tags.length > 0) out.push({ type: 'tags', tags, mode: 'all' });
  return out.length > 0 ? out : null;
}

function maskPhone(e164: string): string {
  const digits = String(e164 ?? '').replace(/\D/g, '');
  return `***${digits.slice(-3)}`;
}

function applyFilters(q: any, filters: ContactFieldFilter[]) {
  for (const f of filters) {
    switch (f.field) {
      case 'has_phone':
        q = f.value ? q.not('phone', 'is', null).neq('phone', '') : q.or('phone.is.null,phone.eq.');
        break;
      case 'source': q = q.eq('source', f.value); break;
      case 'timezone': q = q.eq('timezone', f.value); break;
      case 'created_after': q = q.gte('created_at', f.value); break;
      case 'created_before': q = q.lte('created_at', f.value); break;
    }
  }
  return q;
}

function validateFilters(filters: ContactFieldFilter[]) {
  if (!Array.isArray(filters)) throw new ValidationError('Contact filter is not valid.');
  for (const f of filters) {
    if (f.field === 'has_phone') {
      if (typeof f.value !== 'boolean') throw new ValidationError('The "has a phone number" filter needs yes or no.');
    } else if (f.field === 'source' || f.field === 'timezone') {
      if (typeof f.value !== 'string' || !f.value.trim()) throw new ValidationError(`Enter a value for the ${f.field} filter.`);
    } else if (f.field === 'created_after' || f.field === 'created_before') {
      if (typeof f.value !== 'string' || Number.isNaN(new Date(f.value).getTime())) {
        throw new ValidationError(`The ${f.field.replace('_', ' ')} filter needs a valid date.`);
      }
    } else {
      throw new ValidationError(`Unknown contact filter "${String((f as any).field)}".`);
    }
  }
}

async function pageContacts(db: Db, workspaceId: string, filters: ContactFieldFilter[]): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = db.from('contacts')
      .select('id, first_name, phone, phone_e164, opted_out, sms_opt_out, created_at')
      .eq('workspace_id', workspaceId);
    q = applyFilters(q, filters)
      .order('created_at', { ascending: true }).order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/** Ids matched by one source, or null meaning "every contact in the workspace" (all_contacts). */
async function matchSource(db: Db, workspaceId: string, source: AudienceSource): Promise<{ ids: Set<string> | null; filters: ContactFieldFilter[] }> {
  switch (source.type) {
    case 'all_contacts':
      return { ids: null, filters: [] };

    case 'contact_fields': {
      validateFilters(source.filters);
      return { ids: null, filters: source.filters };
    }

    case 'tags': {
      const tags = (source.tags ?? []).map((t) => String(t ?? '').trim()).filter(Boolean);
      if (tags.length === 0) throw new ValidationError('Choose at least one tag.');
      if (source.mode === 'any') {
        const tagIds = await resolveTagIds(db, workspaceId, tags);
        // An unknown tag has no members; under OR the known ones still count, so look each up on its own.
        const known = tagIds === null ? await knownTagIds(db, workspaceId, tags) : tagIds;
        if (known.length === 0) return { ids: new Set(), filters: [] };
        const ids = new Set<string>();
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await db.from('tag_assignments').select('entity_id')
            .eq('workspace_id', workspaceId).eq('entity_type', 'contact').in('tag_id', known)
            .order('id', { ascending: true }).range(from, from + PAGE - 1);
          if (error) throw new Error(`tag assignment lookup failed: ${error.message}`);
          for (const r of data ?? []) ids.add(r.entity_id);
          if (!data || data.length < PAGE) break;
        }
        return { ids, filters: [] };
      }
      return { ids: await resolveContactIdsWithAllTags(db, workspaceId, tags), filters: [] };
    }

    case 'rule_group': {
      const problem = validateRuleGroup(source.ruleGroup);
      if (problem) throw new ValidationError(problem); // authored for the user, so safe to show
      const matches = await SegmentationCompiler.executeSegment(workspaceId, source.ruleGroup);
      return { ids: new Set(matches.map((c: any) => c.id)), filters: [] };
    }

    case 'saved_segment': {
      // Fail-closed: a deleted/invalid segment errors clearly before anything is written.
      const ruleGroup = await loadSegmentRuleGroup(db, workspaceId, source.segmentId);
      const matches = await SegmentationCompiler.executeSegment(workspaceId, ruleGroup);
      return { ids: new Set(matches.map((c: any) => c.id)), filters: [] };
    }
  }
}

async function knownTagIds(db: Db, workspaceId: string, tags: string[]): Promise<string[]> {
  const out = new Set<string>();
  for (const t of tags) {
    const ids = await resolveTagIds(db, workspaceId, [t]);
    for (const id of ids ?? []) out.add(id);
  }
  return [...out];
}

export async function resolveBroadcastAudience(db: Db, workspaceId: string, spec: AudienceSpec): Promise<ResolvedAudience> {
  const sources = Array.isArray(spec) ? spec : [spec];
  if (sources.length === 0) throw new ValidationError('Select an audience.');

  // Sources are evaluated in order; a source that fails (e.g. a deleted segment) throws before any later lookup.
  let idSet: Set<string> | null = null; // null = unrestricted so far
  const filters: ContactFieldFilter[] = [];
  for (const s of sources) {
    const m = await matchSource(db, workspaceId, s);
    filters.push(...m.filters);
    if (m.ids) idSet = idSet ? new Set([...idSet].filter((id) => m.ids!.has(id))) : m.ids;
  }

  const empty: ResolvedAudience = {
    contactIds: [], counts: { matched: 0, eligible: 0 },
    exclusions: { no_phone: 0, invalid_number: 0, opted_out: 0, suppressed: 0, duplicate_phone: 0 }, sample: [],
  };

  let contacts: any[];
  if (idSet === null) {
    contacts = await pageContacts(db, workspaceId, filters);
  } else {
    if (idSet.size === 0) return empty;
    contacts = [];
    const list = Array.from(idSet);
    for (let i = 0; i < list.length; i += ID_CHUNK) {
      let q = db.from('contacts')
        .select('id, first_name, phone, phone_e164, opted_out, sms_opt_out, created_at')
        .eq('workspace_id', workspaceId)
        .in('id', list.slice(i, i + ID_CHUNK));
      q = applyFilters(q, filters);
      const { data, error } = await q;
      if (error) throw error;
      contacts.push(...(data ?? []));
    }
  }
  const matched = contacts.length;
  if (matched === 0) return empty;

  // Opt-out is unified across SMS and WhatsApp and also lives durably in sms_suppression_list.
  const suppressedPhones = new Set<string>();
  const phones = [...new Set(contacts.map((c) => c.phone_e164).filter(Boolean))] as string[];
  for (let i = 0; i < phones.length; i += ID_CHUNK) {
    const { data: listed, error } = await db.from('sms_suppression_list').select('phone_e164')
      .eq('workspace_id', workspaceId).in('phone_e164', phones.slice(i, i + ID_CHUNK));
    if (error) throw error;
    for (const r of listed ?? []) suppressedPhones.add(r.phone_e164);
  }

  const ex: AudienceExclusions = { no_phone: 0, invalid_number: 0, opted_out: 0, suppressed: 0, duplicate_phone: 0 };
  const passing: any[] = [];
  for (const c of contacts) {
    if (!c.phone || String(c.phone).trim() === '') { ex.no_phone++; continue; }
    if (!c.phone_e164) { ex.invalid_number++; continue; } // can never be messaged or matched to a STOP
    if (c.opted_out || c.sms_opt_out) { ex.opted_out++; continue; }
    if (suppressedPhones.has(c.phone_e164)) { ex.suppressed++; continue; }
    passing.push(c);
  }

  // Dedup by number: keep the oldest contact, count the rest.
  passing.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)));
  const seen = new Set<string>();
  const kept: any[] = [];
  for (const c of passing) {
    if (seen.has(c.phone_e164)) { ex.duplicate_phone++; continue; }
    seen.add(c.phone_e164);
    kept.push(c);
  }

  const sample: MaskedSample[] = kept.slice(0, 5).map((c) => ({
    name: String(c.first_name ?? '').trim().split(/\s+/)[0] || '(no name)',
    phone: maskPhone(c.phone_e164),
  }));

  return { contactIds: kept.map((c) => c.id), counts: { matched, eligible: kept.length }, exclusions: ex, sample };
}

/** Plain-language name of the exclusion with the highest count, for "no eligible recipients" errors. */
export function topExclusionReason(ex: AudienceExclusions): string | null {
  const labels: Record<keyof AudienceExclusions, string> = {
    no_phone: 'contacts with no phone number',
    invalid_number: 'contacts whose phone number could not be read as an international number',
    opted_out: 'contacts who opted out',
    suppressed: 'numbers on the opt-out list',
    duplicate_phone: 'duplicate phone numbers',
  };
  let best: keyof AudienceExclusions | null = null;
  for (const k of Object.keys(labels) as (keyof AudienceExclusions)[]) {
    if (ex[k] > 0 && (best === null || ex[k] > ex[best])) best = k;
  }
  return best ? `${ex[best]} ${labels[best]}` : null;
}

/** Validates a UI-submitted audience and maps it onto a resolver source. Throws ValidationError for bad input. */
export function audienceFromInput(input: BroadcastAudienceInput | null | undefined): AudienceSource {
  if (!input || typeof input !== 'object' || !(AUDIENCE_TYPES as readonly string[]).includes((input as any).type)) {
    throw new ValidationError('Select an audience.');
  }
  switch (input.type) {
    case 'all_contacts': return { type: 'all_contacts' };
    case 'tags': {
      const tags = (input.tags ?? []).map((t) => String(t ?? '').trim()).filter(Boolean);
      if (tags.length === 0) throw new ValidationError('Choose at least one tag.');
      return { type: 'tags', tags, mode: input.mode === 'any' ? 'any' : 'all' };
    }
    case 'contact_fields': {
      if (!Array.isArray(input.filters) || input.filters.length === 0) throw new ValidationError('Add at least one contact filter.');
      return { type: 'contact_fields', filters: input.filters };
    }
    case 'saved_segment': {
      if (!input.segmentId || typeof input.segmentId !== 'string') throw new ValidationError('Choose a saved segment.');
      return { type: 'saved_segment', segmentId: input.segmentId };
    }
  }
}
