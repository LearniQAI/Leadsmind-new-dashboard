import { logger } from '@/shared/logger';

// Google's Places API policy permits caching place_id indefinitely and
// coordinates for up to 30 days; other content (name, address, phone,
// rating, website) is meant to be re-fetched rather than stored
// permanently. Google publishes no separate fixed number for those other
// fields, so this reuses the same 30-day window as the documented
// coordinate cap — a deliberate, conservative choice, not a quoted Google
// number for every field.
const PLACES_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isPlacesDataStale(fetchedAt: string | null | undefined): boolean {
  if (!fetchedAt) return true;
  const fetchedTime = new Date(fetchedAt).getTime();
  if (Number.isNaN(fetchedTime)) return true;
  return Date.now() - fetchedTime > PLACES_CACHE_TTL_MS;
}

/**
 * Re-fetches a lead's Google-sourced fields via its stored place_id if
 * they're past the compliant caching window, and persists the refresh.
 * Only touches fields Google actually returned this call (business_name,
 * address, phone, website, rating, review_count, and coordinates when
 * those are also stale) — never touches fields we own (email, tags,
 * qualification_status, lead_score, enrichment_status, etc).
 *
 * Returns the lead, refreshed in place if a re-fetch happened, unchanged
 * otherwise. Never throws — a refresh failure just leaves the existing
 * (still-displayable) cached data in place.
 */
export async function refreshPlacesDataIfStale(supabase: any, lead: any): Promise<any> {
  const contentStale = isPlacesDataStale(lead.places_data_fetched_at);
  const coordsStale =
    (lead.latitude !== null && lead.latitude !== undefined) && isPlacesDataStale(lead.geocoded_at);

  if (!contentStale && !coordsStale) return lead;
  if (!lead.place_id) return lead;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return lead;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        lead.place_id
      )}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,geometry&key=${apiKey}`
    );
    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      const reason = String(data.error_message || data.status || 'unknown_error').slice(0, 500);
      logger.warn({ leadId: lead.id, placeId: lead.place_id, reason }, 'lead_finder.places_refresh.failed');
      const { error: markError } = await supabase
        .from('lead_finder_results')
        .update({ places_data_fetched_at: new Date().toISOString(), places_refetch_error: reason })
        .eq('id', lead.id);
      if (markError) {
        logger.error({ err: markError, leadId: lead.id }, 'lead_finder.places_refresh.mark_failed.failed');
      }
      // Attempt is recorded so a permanently-broken place_id doesn't get
      // hit again on every view; existing cached data is left as-is.
      return { ...lead, places_refetch_error: reason };
    }

    const result = data.result;
    const updates: Record<string, unknown> = {
      places_data_fetched_at: new Date().toISOString(),
      places_refetch_error: null,
    };
    if (result.name) updates.business_name = result.name;
    if (result.formatted_address) updates.address = result.formatted_address;
    updates.phone = result.formatted_phone_number || null;
    updates.website = result.website || null;
    updates.rating = result.rating ?? null;
    updates.review_count = result.user_ratings_total ?? null;

    if (coordsStale && Number.isFinite(result.geometry?.location?.lat) && Number.isFinite(result.geometry?.location?.lng)) {
      updates.latitude = result.geometry.location.lat;
      updates.longitude = result.geometry.location.lng;
      updates.geocoded_at = new Date().toISOString();
      updates.geocode_attempted_at = new Date().toISOString();
      updates.geocode_error = null;
    }

    const { data: updated, error } = await supabase
      .from('lead_finder_results')
      .update(updates)
      .eq('id', lead.id)
      .select('*')
      .single();

    if (error) {
      logger.error({ err: error, leadId: lead.id }, 'lead_finder.places_refresh.persist_failed');
      return lead;
    }

    logger.info({ leadId: lead.id, placeId: lead.place_id }, 'lead_finder.places_refresh.succeeded');
    return updated;
  } catch (err) {
    logger.error({ err, leadId: lead.id, placeId: lead.place_id }, 'lead_finder.places_refresh.request_failed');
    return lead;
  }
}
