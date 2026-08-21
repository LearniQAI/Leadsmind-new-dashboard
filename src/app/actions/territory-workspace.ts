'use server';

import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { logger } from '@/shared/logger';

interface Territory {
  region: string;
  leadCount: number;
  saturation: string;
  score: number;
  level: string;
}

const hasCoordinates = (lead: any) =>
  lead.latitude !== null && lead.latitude !== undefined &&
  lead.longitude !== null && lead.longitude !== undefined &&
  Number.isFinite(Number(lead.latitude)) && Number.isFinite(Number(lead.longitude));

async function geocodeAndCacheLegacyLead(supabase: any, lead: any) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !lead.address) return;
  try {
    const response = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(lead.address) + '&key=' + apiKey, { cache: 'no-store' });
    const payload = await response.json();
    const location = payload.results?.[0]?.geometry?.location;
    if (!response.ok || payload.status !== 'OK' || !Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) {
      const reason = payload.error_message || payload.status || 'HTTP ' + response.status;
      logger.warn({ leadId: lead.id, geocodeStatus: payload.status, reason }, 'territory_workspace.lead_geocode.failed');
      await supabase.from('lead_finder_results').update({ geocode_attempted_at: new Date().toISOString(), geocode_error: String(reason).slice(0, 500) }).eq('id', lead.id);
      return;
    }
    await supabase.from('lead_finder_results').update({ latitude: location.lat, longitude: location.lng, geocoded_at: new Date().toISOString(), geocode_attempted_at: new Date().toISOString(), geocode_error: null }).eq('id', lead.id);
    logger.info({ leadId: lead.id }, 'territory_workspace.lead_geocode.succeeded');
  } catch (err: any) {
    // A transport failure is logged but not cached as final, so it can retry.
    logger.error({ err, leadId: lead.id }, 'territory_workspace.lead_geocode.request_failed');
  }
}

export async function getTerritoryMapData(searchId?: string) {
  const supabase = await createServerClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user?.id) return { success: false, error: 'Unauthorized' };

  const cookieStore = cookies();
  const workspaceId = cookieStore.get('active_workspace_id')?.value;
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  let searchIds: string[];
  if (searchId) {
    // Scoped to one search — verify it belongs to this workspace before using it.
    const { data: search, error: searchError } = await supabase
      .from('lead_finder_searches')
      .select('id')
      .eq('id', searchId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (searchError) {
      logger.error({ err: searchError, workspaceId, searchId }, 'territory_workspace.search.fetch.failed');
      return { success: false, error: 'Failed to fetch territory data.' };
    }
    if (!search) return { success: false, error: 'Search not found.' };
    searchIds = [search.id];
  } else {
    // Results are tenant-scoped through their parent search. The map is based
    // on stored coordinates, never synthetic positions.
    const { data: searches, error: searchesError } = await supabase
      .from('lead_finder_searches')
      .select('id')
      .eq('workspace_id', workspaceId);
    if (searchesError) {
      logger.error({ err: searchesError, workspaceId }, 'territory_workspace.searches.fetch.failed');
      return { success: false, error: 'Failed to fetch territory data.' };
    }
    searchIds = (searches ?? []).map((search: any) => search.id);
  }
  if (searchIds.length === 0) return { success: true, data: { territories: [] as Territory[], networks: [] as any[], leads: [] as any[], noLocationLeads: [] as any[] } };

  const { data: initialLeads, error } = await supabase
    .from('lead_finder_results')
    .select('*')
    .in('search_id', searchIds)
    .limit(200);

  if (error) {
    logger.error({ err: error }, 'territory_workspace.map_data.fetch.failed');
    return { success: false, error: 'Failed to fetch territory data.' };
  }

  if (!initialLeads || initialLeads.length === 0) return { success: true, data: { territories: [] as Territory[], networks: [] as any[], leads: [] as any[], noLocationLeads: [] as any[] } };

  const legacyCandidates = initialLeads
    .filter((lead: any) => lead.address && !hasCoordinates(lead) && !lead.geocode_attempted_at)
    .slice(0, 20);
  await Promise.all(legacyCandidates.map((lead: any) => geocodeAndCacheLegacyLead(supabase, lead)));

  const { data: leads, error: refreshedLeadsError } = await supabase
    .from('lead_finder_results')
    .select('*')
    .in('search_id', searchIds)
    .limit(200);
  if (refreshedLeadsError) {
    logger.error({ err: refreshedLeadsError, workspaceId }, 'territory_workspace.map_data.refresh.failed');
    return { success: false, error: 'Failed to refresh territory data.' };
  }

  const mappedLeads = (leads ?? []).filter(hasCoordinates);
  const noLocationLeads = (leads ?? []).filter((lead: any) => !hasCoordinates(lead));
  // Group genuinely geocoded leads by their saved address.
  const territoriesMap: Record<string, any[]> = {};
  mappedLeads.forEach(lead => {
    const loc = lead.address || 'Unknown Region';
    if (!territoriesMap[loc]) territoriesMap[loc] = [];
    territoriesMap[loc].push(lead);
  });

  const territories: Territory[] = Object.entries(territoriesMap).map(([region, tLeads]) => {
    return {
      region,
      leadCount: tLeads.length,
      saturation: 'Medium',
      score: 75,
      level: 'Hot'
    };
  }).sort((a, b) => b.score - a.score);

  // Network Detection
  const networks: any[] = [];

  return { 
    success: true, 
    data: { 
      territories, 
      networks,
      leads: mappedLeads,
      noLocationLeads,
      // Never expose the server-side Places/Geocoding key to the browser.
      // Maps JavaScript needs its own referrer-restricted browser key.
      mapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    } 
  };
}
