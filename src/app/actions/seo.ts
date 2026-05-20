'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId as getWsId, getCurrentWorkspace } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function getActiveWorkspaceId() {
  const id = await getWsId();
  if (id) return id;
  
  const ws = await getCurrentWorkspace();
  return ws?.id || null;
}

// GOOGLE OAUTH URL GENERATOR
export async function getGoogleAuthUrl() {
  try {
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId!,
      redirect_uri: redirectUri,
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: workspaceId
    });

    return { data: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  } catch (error: any) {
    return { error: error.message };
  }
}

// SEO PROJECT ACTIONS
export async function getSeoProject() {
  try {
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('seo_projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data: data || null };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateSeoProjectDomain(domainUrl: string) {
  try {
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    // Clean up domain URL input (ensure no protocol prefix)
    let domain = domainUrl.trim();
    if (domain.startsWith('http://')) domain = domain.replace('http://', '');
    if (domain.startsWith('https://')) domain = domain.replace('https://', '');
    if (domain.endsWith('/')) domain = domain.slice(0, -1);

    const supabase = await createServerClient();
    
    // Check if project exists
    const { data: existing } = await supabase
      .from('seo_projects')
      .select('id')
      .eq('workspace_id', workspaceId)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('seo_projects')
        .update({ domain_url: domain })
        .eq('workspace_id', workspaceId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('seo_projects')
        .insert({
          workspace_id: workspaceId,
          domain_url: domain,
          gsc_connected: false
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    
    revalidatePath('/settings');
    return { data: result.data };
  } catch (error: any) {
    return { error: error.message };
  }
}

// KEYWORDS MANAGEMENT ACTIONS
export async function getTrackedKeywords() {
  try {
    const projectRes = await getSeoProject();
    if (projectRes.error) return { error: projectRes.error };
    if (!projectRes.data) return { data: [] };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('seo_tracked_keywords')
      .select('*')
      .eq('project_id', projectRes.data.id)
      .order('keyword', { ascending: true });

    if (error) throw error;
    return { data: data || [] };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function addTrackedKeyword(keyword: string, targetUrl?: string) {
  try {
    const projectRes = await getSeoProject();
    if (projectRes.error) return { error: projectRes.error };
    if (!projectRes.data) return { error: 'Please configure your SEO Domain first.' };

    const supabase = await createServerClient();
    
    // Clean target URL if specified
    let cleanUrl = targetUrl?.trim() || null;

    const { data, error } = await supabase
      .from('seo_tracked_keywords')
      .insert({
        project_id: projectRes.data.id,
        keyword: keyword.trim(),
        target_url: cleanUrl,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: 'This keyword is already being tracked in this project.' };
      }
      throw error;
    }

    revalidatePath('/settings');
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteTrackedKeyword(id: string) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('seo_tracked_keywords')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// CONTENT PIPELINE ACTIONS
export async function getContentPipeline() {
  try {
    const projectRes = await getSeoProject();
    if (projectRes.error) return { error: projectRes.error };
    if (!projectRes.data) return { data: [] };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('seo_content_pipeline')
      .select('*')
      .eq('project_id', projectRes.data.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [] };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updatePipelineStatus(id: string, status: 'Idea' | 'Research' | 'Approved' | 'Outlined' | 'Writing' | 'Review' | 'Scheduled' | 'Published') {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('seo_content_pipeline')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/settings');
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function addPipelineItem(keyword: string, status: 'Idea' | 'Research' | 'Approved' | 'Outlined' | 'Writing' | 'Review' | 'Scheduled' | 'Published' = 'Idea', title?: string, targetDate?: string) {
  try {
    const projectRes = await getSeoProject();
    if (projectRes.error) return { error: projectRes.error };
    if (!projectRes.data) return { error: 'Please configure your SEO Domain first.' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('seo_content_pipeline')
      .insert({
        project_id: projectRes.data.id,
        keyword: keyword.trim(),
        status,
        title: title?.trim() || null,
        target_date: targetDate || null
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: 'A content pipeline item already exists for this keyword.' };
      }
      throw error;
    }

    revalidatePath('/settings');
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deletePipelineItem(id: string) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('seo_content_pipeline')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// METRICS / HISTORICAL DATA ACTIONS
export async function getSeoMetricsSummary() {
  try {
    const projectRes = await getSeoProject();
    if (projectRes.error) return { error: projectRes.error };
    if (!projectRes.data) return { data: null };

    const project = projectRes.data;
    
    const supabase = await createServerClient();
    
    // Get recent 30-day keyword metrics from seo_keyword_performance
    const { data: performanceLogs, error: perfError } = await supabase
      .from('seo_keyword_performance')
      .select('*')
      .eq('project_id', project.id)
      .order('date', { ascending: false });

    if (perfError) throw perfError;

    // Get current rank history averages
    const { data: rankLogs, error: rankError } = await supabase
      .from('seo_rank_history')
      .select('*')
      .eq('project_id', project.id)
      .order('date', { ascending: false });

    if (rankError) throw rankError;

    const gapRes = await getCompetitorGapAnalysis();
    const gapAnalysis = gapRes.data || [];

    return {
      data: {
        project,
        performanceLogs: performanceLogs || [],
        rankLogs: rankLogs || [],
        gapAnalysis
      }
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

// URL Matching Helper
function urlMatchesDomain(url: string, targetDomain: string): boolean {
  if (!url || !targetDomain) return false;
  try {
    const cleanTarget = targetDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    const cleanUrlDomain = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
    return cleanUrlDomain === cleanTarget || cleanUrlDomain.endsWith('.' + cleanTarget);
  } catch {
    return url.toLowerCase().includes(targetDomain.toLowerCase());
  }
}

// Phase 2: Competitor & Local SERP Actions
export async function updateSeoProjectCompetitors(competitorDomains: string[], gbpName?: string) {
  try {
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    // Clean up domains
    const cleanedCompetitors = competitorDomains
      .map(d => {
        let domain = d.trim();
        if (domain.startsWith('http://')) domain = domain.replace('http://', '');
        if (domain.startsWith('https://')) domain = domain.replace('https://', '');
        if (domain.endsWith('/')) domain = domain.slice(0, -1);
        return domain;
      })
      .filter(d => d.length > 0)
      .slice(0, 5); // Limit to up to 5 domains

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('seo_projects')
      .update({
        competitor_domains: cleanedCompetitors,
        google_business_profile: gbpName?.trim() || null
      })
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/settings');
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function triggerDataForSeoSync() {
  try {
    const projectRes = await getSeoProject();
    if (projectRes.error) return { error: projectRes.error };
    if (!projectRes.data) return { error: 'Please configure your SEO Domain first.' };

    const project = projectRes.data;
    const supabase = await createServerClient();
    
    // Fetch all active keywords for this project
    const { data: keywords, error: kwError } = await supabase
      .from('seo_tracked_keywords')
      .select('*')
      .eq('project_id', project.id)
      .eq('is_active', true);

    if (kwError) throw kwError;
    if (!keywords || keywords.length === 0) {
      return { success: true, message: 'No active tracked keywords to sync.' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const dataForSeoEmail = process.env.DATAFORSEO_EMAIL;
    const dataForSeoPassword = process.env.DATAFORSEO_PASSWORD;

    const useMock = !dataForSeoEmail || !dataForSeoPassword;
    const syncLogs: any[] = [];

    if (useMock) {
      console.log('DataForSEO credentials missing. Utilizing robust mock fallback engine...');
      
      for (const kw of keywords) {
        const keyword = kw.keyword;
        const hash = keyword.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        // Client Rank
        let clientRank: number | null = (hash % 10) + 1; // 1 to 10
        if (hash % 7 === 0) clientRank = null; // Sometimes unranked

        const rankingUrl = clientRank ? `https://${project.domain_url}/${keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : null;
        
        // Featured Snippet
        const featuredSnippet = clientRank === 1 && (hash % 3 === 0);

        // Local Map Pack presence
        const localPack = project.google_business_profile ? (hash % 4 === 0) : false;

        // People Also Ask Count
        const peopleAlsoAskCount = (hash % 4) + 2; // 2 to 5 questions

        // Competitor Ranks
        const competitorRanks: Record<string, number | null> = {};
        project.competitor_domains.forEach((comp: string, idx: number) => {
          let compRank: number | null = ((hash + idx * 7) % 25) + 1; // 1 to 25
          if ((hash + idx) % 5 === 0) compRank = null; // Sometimes unranked
          competitorRanks[comp] = compRank;
        });

        syncLogs.push({
          project_id: project.id,
          keyword,
          rank: clientRank,
          date: todayStr,
          ranking_url: rankingUrl,
          featured_snippet: featuredSnippet,
          local_pack: localPack,
          people_also_ask_count: peopleAlsoAskCount,
          competitor_ranks: competitorRanks
        });
      }
    } else {
      console.log(`Connecting to DataForSEO Live Advanced organic endpoint for ${keywords.length} keywords...`);
      const auth = Buffer.from(`${dataForSeoEmail}:${dataForSeoPassword}`).toString('base64');
      
      const tasks = keywords.map(kw => ({
        keyword: kw.keyword,
        location_code: 2710, // South Africa
        language_code: 'en',
        depth: 100
      }));

      const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tasks)
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.status_message || 'DataForSEO Request Failed');
      }

      const results = resJson.tasks || [];
      
      for (let i = 0; i < results.length; i++) {
        const task = results[i];
        const keyword = keywords[i].keyword;
        const items = task.result?.[0]?.items || [];

        let clientRank: number | null = null;
        let rankingUrl: string | null = null;
        let featuredSnippet = false;
        let localPack = false;
        let peopleAlsoAskCount = 0;
        const competitorRanks: Record<string, number | null> = {};

        // Initialize competitors
        project.competitor_domains.forEach((comp: string) => {
          competitorRanks[comp] = null;
        });

        for (const item of items) {
          if (item.type === 'organic' || item.type === 'featured_snippet') {
            const itemUrl = item.url || '';
            
            if (urlMatchesDomain(itemUrl, project.domain_url)) {
              if (clientRank === null || item.rank_absolute < clientRank) {
                clientRank = item.rank_absolute;
                rankingUrl = itemUrl;
              }
              if (item.type === 'featured_snippet') {
                featuredSnippet = true;
              }
            }

            project.competitor_domains.forEach((comp: string) => {
              if (urlMatchesDomain(itemUrl, comp)) {
                if (competitorRanks[comp] === null || item.rank_absolute < competitorRanks[comp]!) {
                  competitorRanks[comp] = item.rank_absolute;
                }
              }
            });
          }

          if (item.type === 'local_pack' && project.google_business_profile) {
            const mapBusinesses = item.items || [];
            const hasGbp = mapBusinesses.some((biz: any) => 
              biz.title?.toLowerCase().includes(project.google_business_profile.toLowerCase())
            );
            if (hasGbp) {
              localPack = true;
            }
          }

          if (item.type === 'people_also_ask') {
            peopleAlsoAskCount = item.items?.length || 0;
          }
        }

        syncLogs.push({
          project_id: project.id,
          keyword,
          rank: clientRank,
          date: todayStr,
          ranking_url: rankingUrl,
          featured_snippet: featuredSnippet,
          local_pack: localPack,
          people_also_ask_count: peopleAlsoAskCount,
          competitor_ranks: competitorRanks
        });
      }
    }

    const { error: upsertError } = await supabase
      .from('seo_rank_history')
      .upsert(syncLogs, { onConflict: 'project_id,keyword,date' });

    if (upsertError) throw upsertError;

    revalidatePath('/settings');
    return { success: true, count: syncLogs.length, data: syncLogs };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function triggerCompetitorKeywordsWeekly() {
  try {
    const projectRes = await getSeoProject();
    if (projectRes.error) return { error: projectRes.error };
    if (!projectRes.data) return { error: 'Please configure your SEO Domain first.' };

    const project = projectRes.data;
    const supabase = await createServerClient();

    if (!project.competitor_domains || project.competitor_domains.length === 0) {
      return { success: true, message: 'No competitor domains configured for weekly scan.' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const dataForSeoEmail = process.env.DATAFORSEO_EMAIL;
    const dataForSeoPassword = process.env.DATAFORSEO_PASSWORD;

    const useMock = !dataForSeoEmail || !dataForSeoPassword;
    const competitorKeywordLogs: any[] = [];

    if (useMock) {
      console.log('DataForSEO credentials missing. Mocking weekly competitor organic keyword scan...');
      
      const mockKeywords = [
        'crm software cape town', 'sales pipeline software', 'leads builder tools',
        'google reviews manager', 'whatsapp automation tools', 'sales tracker south africa',
        'marketing platform johannesburg', 'invoice generator za', 'client portal software',
        'sales manager application', 'b2b marketing agency durban', 'saas pricing planner'
      ];

      project.competitor_domains.forEach((comp: string, compIdx: number) => {
        mockKeywords.forEach((kw, kwIdx) => {
          const hash = kw.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + compIdx;
          if (hash % 3 !== 0) {
            const rank = (hash % 18) + 2; // rank between 2 and 20
            competitorKeywordLogs.push({
              project_id: project.id,
              competitor_domain: comp,
              keyword: kw,
              rank,
              url: `https://${comp}/blog/${kw.replace(/\s+/g, '-')}`,
              date: todayStr
            });
          }
        });
      });
    } else {
      console.log(`Connecting to DataForSEO Domain Organic Keywords endpoint for ${project.competitor_domains.length} competitor(s)...`);
      const auth = Buffer.from(`${dataForSeoEmail}:${dataForSeoPassword}`).toString('base64');
      
      for (const comp of project.competitor_domains) {
        const response = await fetch('https://api.dataforseo.com/v3/seo/google/organic/organic_keywords/live', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([
            {
              "target": comp,
              "location_code": 2710, // South Africa
              "language_code": "en",
              "limit": 50
            }
          ])
        });

        const resJson = await response.json();
        if (!response.ok) {
          console.error(`Weekly scan failed for competitor ${comp}:`, resJson.status_message);
          continue;
        }

        const items = resJson.tasks?.[0]?.result?.[0]?.items || [];
        for (const item of items) {
          if (item.keyword_data?.keyword) {
            competitorKeywordLogs.push({
              project_id: project.id,
              competitor_domain: comp,
              keyword: item.keyword_data.keyword,
              rank: item.ranking_data?.rank_absolute || 100,
              url: item.ranking_data?.url || `https://${comp}`,
              date: todayStr
            });
          }
        }
      }
    }

    if (competitorKeywordLogs.length > 0) {
      const { error: upsertError } = await supabase
        .from('seo_competitor_keywords')
        .upsert(competitorKeywordLogs, { onConflict: 'project_id,competitor_domain,keyword,date' });

      if (upsertError) throw upsertError;
    }

    revalidatePath('/settings');
    return { success: true, count: competitorKeywordLogs.length, data: competitorKeywordLogs };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getCompetitorGapAnalysis() {
  try {
    const projectRes = await getSeoProject();
    if (projectRes.error) return { error: projectRes.error };
    if (!projectRes.data) return { data: [] };

    const project = projectRes.data;
    const supabase = await createServerClient();

    // 1. Get the latest competitor keyword ranks (competitor rank <= 20)
    const { data: compKeywords, error: compError } = await supabase
      .from('seo_competitor_keywords')
      .select('*')
      .eq('project_id', project.id)
      .lte('rank', 20)
      .order('date', { ascending: false });

    if (compError) throw compError;
    if (!compKeywords || compKeywords.length === 0) return { data: [] };

    const latestCompMap = new Map<string, any>();
    compKeywords.forEach(item => {
      const key = `${item.competitor_domain}:${item.keyword}`;
      if (!latestCompMap.has(key)) {
        latestCompMap.set(key, item);
      }
    });
    const uniqueCompKeywords = Array.from(latestCompMap.values());

    // 2. Retrieve client's latest keyword rankings from seo_rank_history
    const { data: clientRanks, error: clientError } = await supabase
      .from('seo_rank_history')
      .select('*')
      .eq('project_id', project.id)
      .order('date', { ascending: false });

    if (clientError) throw clientError;

    const latestClientRanks = new Map<string, number | null>();
    if (clientRanks) {
      clientRanks.forEach(r => {
        if (!latestClientRanks.has(r.keyword)) {
          latestClientRanks.set(r.keyword, r.rank);
        }
      });
    }

    // 3. Build gap analysis list: competitor rank <= 20 while client rank is null (or not found in client ranks)
    const gaps: any[] = [];
    uniqueCompKeywords.forEach(item => {
      const clientRank = latestClientRanks.has(item.keyword) ? latestClientRanks.get(item.keyword) : null;
      if (clientRank === null) {
        gaps.push({
          keyword: item.keyword,
          competitor_domain: item.competitor_domain,
          competitor_rank: item.rank,
          competitor_url: item.url,
          date: item.date
        });
      }
    });

    gaps.sort((a, b) => a.competitor_rank - b.competitor_rank);

    return { data: gaps };
  } catch (error: any) {
    return { error: error.message };
  }
}
