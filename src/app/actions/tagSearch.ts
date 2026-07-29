'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

// The LLM only ever produces this shape — a structured filter over fields we know
// are real (see the Part 2 Phase 1 audit: contacts has no city/location column at
// all, so a query like the PRD's own "...from Cape Town..." example literally can't
// be filtered on real data yet). The LLM never generates the answer itself; every
// result returned below comes from a real Supabase query against these fields.
interface StructuredFilter {
  tagNames?: string[];
  hasUnpaidInvoice?: boolean;
  minLeadScore?: number;
  unsupportedRequest?: string; // e.g. "location filtering" if the query asked for something we can't do
}

export async function searchTagsNaturalLanguage(query: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data: canSpend } = await supabase.rpc('deduct_ai_credit', { p_workspace_id: workspaceId, p_amount: 1 });
  if (!canSpend) {
    return { success: false, error: 'AI credit limit reached for this workspace' };
  }

  const { data: tags } = await supabase.from('tags').select('name').eq('workspace_id', workspaceId);
  const knownTagNames = (tags ?? []).map((t) => t.name);

  let filter: StructuredFilter = {};
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `Translate this CRM search into a structured filter. Only use these real, existing fields — never invent others:
- tagNames: array of tag names from this exact list ONLY: ${JSON.stringify(knownTagNames)}
- hasUnpaidInvoice: true if the query asks about unpaid/outstanding/overdue invoices
- minLeadScore: number, only if the query mentions a lead score threshold
- unsupportedRequest: a short string describing any part of the query that can't be answered with the above (e.g. "location/city filtering" — there is no location field on contacts)

Query: "${query}"
Respond with ONLY a JSON object matching this shape, omitting fields that don't apply.`,
        },
      ],
    });
    filter = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
  } catch (err) {
    logger.error({ err, workspaceId }, 'tag_search.nl_translation.failed');
    return { success: false, error: 'Failed to interpret search query' };
  }

  // Ground the filter: drop any tag name the LLM hallucinated that isn't real.
  const validTagNames = (filter.tagNames ?? []).filter((name) => knownTagNames.includes(name));

  let contactIds: string[] | null = null;

  if (validTagNames.length > 0) {
    const { data: matchingTags } = await supabase.from('tags').select('id').eq('workspace_id', workspaceId).in('name', validTagNames);
    const tagIds = (matchingTags ?? []).map((t) => t.id);

    const { data: assignments } = await supabase
      .from('tag_assignments')
      .select('entity_id, tag_id')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', 'contact')
      .in('tag_id', tagIds);

    // Intersection: contact must have ALL requested tags, not just any one of them.
    const countsByContact = new Map<string, number>();
    (assignments ?? []).forEach((a) => countsByContact.set(a.entity_id, (countsByContact.get(a.entity_id) ?? 0) + 1));
    contactIds = Array.from(countsByContact.entries())
      .filter(([, count]) => count === tagIds.length)
      .map(([id]) => id);

    if (contactIds.length === 0) {
      return { success: true, data: [], interpretedFilter: filter, unsupportedNote: filter.unsupportedRequest };
    }
  }

  if (filter.hasUnpaidInvoice) {
    const { data: unpaidInvoices } = await supabase
      .from('invoices')
      .select('contact_id')
      .eq('workspace_id', workspaceId)
      .neq('status', 'paid')
      .neq('status', 'void');
    const unpaidContactIds = new Set((unpaidInvoices ?? []).map((i) => i.contact_id));
    contactIds = contactIds === null ? Array.from(unpaidContactIds) : contactIds.filter((id) => unpaidContactIds.has(id));
  }

  let queryBuilder = supabase
    .from('contacts')
    .select('id, first_name, last_name, email, lead_score, tags')
    .eq('workspace_id', workspaceId);

  if (contactIds !== null) queryBuilder = queryBuilder.in('id', contactIds);
  if (typeof filter.minLeadScore === 'number') queryBuilder = queryBuilder.gte('lead_score', filter.minLeadScore);

  const { data: contacts, error } = await queryBuilder.limit(100);
  if (error) {
    logger.error({ err: error, workspaceId }, 'tag_search.execute.failed');
    return { success: false, error: 'Search query failed' };
  }

  return { success: true, data: contacts ?? [], interpretedFilter: filter, unsupportedNote: filter.unsupportedRequest };
}
