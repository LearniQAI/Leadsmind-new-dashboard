'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

import { EnrichmentEngine } from '@/lib/lead-finder/EnrichmentEngine';

export async function searchGooglePlaces(params: {
  searchType: string;
  location: string;
  businessType: string;
  keywords: string;
  radius: number;
}) {
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!API_KEY) {
    console.error('[LeadFinder] Missing Google Places API Key.');
    return { success: false, error: 'Google API key is not configured.' };
  }

  try {
    let query = '';
    if (params.searchType === 'keyword') {
      query = `${params.keywords} in ${params.location}`;
    } else {
      query = `${params.businessType} in ${params.location}`;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query
      )}&radius=${params.radius}&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status === 'REQUEST_DENIED' || data.status === 'OVER_QUERY_LIMIT') {
      console.error('[LeadFinder] Google API Error:', data.error_message || data.status);
      throw new Error(data.error_message || 'API quota exceeded or billing disabled.');
    }

    if (data.status === 'ZERO_RESULTS') {
      return { success: true, data: [] };
    }

    if (data.status !== 'OK') {
      throw new Error(`Google API error: ${data.status}`);
    }

    const results = data.results.slice(0, 20);
    
    const enrichedResults = await Promise.all(
      results.map(async (place: any) => {
        const detailsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types,geometry,business_status&key=${API_KEY}`
        );
        const detailsData = await detailsResponse.json();
        const details = detailsData.result || {};
        
        const baseLead = {
          place_id: place.place_id,
          business_name: details.name || place.name,
          category: (details.types || place.types || [])[0] || params.businessType,
          address: details.formatted_address || place.formatted_address,
          phone: details.formatted_phone_number || '',
          website: details.website || '',
          rating: details.rating || place.rating || 0,
          review_count: details.user_ratings_total || place.user_ratings_total || 0,
          latitude: details.geometry?.location?.lat || place.geometry?.location?.lat,
          longitude: details.geometry?.location?.lng || place.geometry?.location?.lng,
          business_status: details.business_status || place.business_status,
          tags: [params.businessType].filter(Boolean),
        };

        // Run through unified enrichment pipeline (LinkedIn, FB, Score)
        return await EnrichmentEngine.enrichLead(baseLead);
      })
    );

    return { success: true, data: enrichedResults };
  } catch (error: any) {
    console.error('[LeadFinder] Search error:', error);
    return { success: false, error: error.message || 'Failed to search places' };
  }
}

export async function saveLeadSearchAndResults(
  searchParams: {
    searchType: string;
    location: string;
    businessType: string;
    keywords: string;
    radius: number;
  },
  results: any[]
) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    // 1. Save Search
    const { data: searchRecord, error: searchError } = await supabase
      .from('lead_finder_searches')
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        search_type: searchParams.searchType,
        keywords: searchParams.keywords,
        location: searchParams.location,
        business_type: searchParams.businessType,
        radius: searchParams.radius,
        results_count: results.length,
      })
      .select()
      .single();

    if (searchError) {
      console.error('[LeadFinder] Error saving search:', searchError);
      return { success: false, error: searchError.message };
    }

    // 2. Save Results
    if (results.length > 0) {
      const resultsToInsert = results.map((r) => ({
        search_id: searchRecord.id,
        user_id: userId,
        place_id: r.place_id,
        business_name: r.business_name,
        category: r.category,
        address: r.address,
        phone: r.phone,
        website: r.website,
        rating: r.rating,
        review_count: r.review_count,
        tags: r.tags,
        linkedin_url: r.linkedin_url,
        facebook_url: r.facebook_url,
        employee_size: r.employee_size,
        lead_score: r.lead_score,
        enrichment_status: r.enrichment_status,
        industry: r.industry,
        description: r.description,
      }));

      const { error: resultsError } = await supabase
        .from('lead_finder_results')
        .upsert(resultsToInsert, { onConflict: 'search_id, place_id' });

      if (resultsError) {
        console.error('[LeadFinder] Error saving results:', resultsError);
        return { success: false, error: resultsError.message };
      }
    }

    revalidatePath('/lead-finder/saved');
    return { success: true, searchId: searchRecord.id };
  } catch (error: any) {
    console.error('[LeadFinder] Fatal error saving search:', error);
    return { success: false, error: error.message || 'Database connection error' };
  }
}

export async function getSavedSearches() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('lead_finder_searches')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function addLeadsToCRM(leads: any[], tags: string[]) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  const supabase = await createServerClient();
  let addedCount = 0;

  for (const lead of leads) {
    const contactPayload = {
      workspace_id: workspaceId,
      first_name: lead.business_name,
      last_name: null,
      email: null, // Usually not provided by places API easily
      phone: lead.phone,
      source: 'Lead Finder',
      tags: [...(lead.smart_tags || []), ...(lead.tags || []), ...tags, 'Lead Finder'],
    };

    const { error: contactError } = await supabase.from('contacts').insert(contactPayload);

    if (!contactError) {
      addedCount++;
      // Update result status
      await supabase
        .from('lead_finder_results')
        .update({ status: 'added_to_crm' })
        .eq('place_id', lead.place_id);
    } else {
      console.error('[LeadFinder] Failed to add contact:', contactError);
      return { success: false, error: contactError.message };
    }
  }

  revalidatePath('/contacts');
  return { success: addedCount > 0, addedCount };
}

export async function deleteSavedSearch(id: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.from('lead_finder_searches').delete().eq("id", id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/lead-finder/saved');
  return { success: true };
}

export async function toggleSearchAlert(id: string, enabled: boolean) {
  const supabase = await createServerClient();
  const { error } = await supabase.from('lead_finder_searches').update({ alerts_enabled: enabled }).eq("id", id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/lead-finder/saved');
  return { success: true };
}
