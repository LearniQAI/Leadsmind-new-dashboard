import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Setup default environmental variables fallback
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ALGORITHM = 'aes-256-cbc';

// Self-contained decryption to avoid path alias resolution overhead in external node runners
function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const secret = process.env.ENCRYPTION_KEY || 
                   process.env.GOOGLE_CLIENT_SECRET || 
                   process.env.SUPABASE_SERVICE_ROLE_KEY || 
                   'leadsmind-fallback-hex-secret-key-32b';
    
    const key = crypto.createHash('sha256').update(secret).digest();
    const parts = encryptedText.split(':');
    if (parts.length !== 2) throw new Error('Invalid layout');

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.error('Decryption failed:', err.message);
    throw err;
  }
}

/**
 * Obtains a fresh access token from Google using the refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh token');
  }
  return data.access_token;
}

/**
 * Queries Google Search Console properties to find the best match for the project domain
 */
async function findGscSiteProperty(accessToken: string, targetDomain: string): Promise<string | null> {
  const response = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to list GSC sites');
  }

  const siteEntries = data.siteEntry || [];
  if (siteEntries.length === 0) return null;

  // Formats we want to match:
  const scDomain = `sc-domain:${targetDomain}`.toLowerCase();
  const httpsUrl = `https://${targetDomain}/`.toLowerCase();
  const httpUrl = `http://${targetDomain}/`.toLowerCase();

  // Try exact matches in order
  for (const entry of siteEntries) {
    const siteUrl = entry.siteUrl.toLowerCase();
    if (siteUrl === scDomain || siteUrl === httpsUrl || siteUrl === httpUrl) {
      return entry.siteUrl;
    }
  }

  // Soft fallback: contains the domain
  for (const entry of siteEntries) {
    if (entry.siteUrl.toLowerCase().includes(targetDomain.toLowerCase())) {
      return entry.siteUrl;
    }
  }

  // Absolute fallback: use domain format directly
  return `sc-domain:${targetDomain}`;
}

/**
 * Fetches GSC analytics for a given site with South African (ZAF) filter
 */
async function fetchGscSearchAnalytics(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['query', 'date'],
        dimensionFilterGroups: [
          {
            filters: [
              {
                dimension: 'country',
                operator: 'equals',
                expression: 'zaf' // South Africa filter!
              }
            ]
          }
        ],
        rowLimit: 2500
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    console.error('GSC Query failed for site:', siteUrl, data);
    throw new Error(data.error?.message || 'Search Analytics API error');
  }

  return data.rows || [];
}

/**
 * Main synchronizer function
 */
export async function runGscSync() {
  console.log('--- STARTING DAILY GOOGLE SEARCH CONSOLE SYNCHRONIZATION WORKER ---');
  try {
    // 1. Fetch connected SEO projects
    const { data: projects, error } = await supabase
      .from('seo_projects')
      .select('*')
      .eq('gsc_connected', true)
      .not('gsc_refresh_token_encrypted', 'is', null);

    if (error) throw error;
    if (!projects || projects.length === 0) {
      console.log('No GSC-connected SEO projects found.');
      return { status: 'skipped', message: 'No active SEO integrations found.' };
    }

    console.log(`Discovered ${projects.length} GSC integrations to process.`);

    // Determine 30-day date range (yesterday is usually the most recent data available in GSC)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startRangeDate = new Date();
    startRangeDate.setDate(yesterday.getDate() - 30);

    const formatDateStr = (d: Date) => d.toISOString().split('T')[0];
    const startDateStr = formatDateStr(startRangeDate);
    const endDateStr = formatDateStr(yesterday);

    console.log(`Syncing data range: ${startDateStr} to ${endDateStr}`);

    let processedCount = 0;

    for (const project of projects) {
      try {
        console.log(`Processing Project: ${project.id} | Domain: ${project.domain_url}`);

        // 2. Decrypt Google Refresh Token
        const refreshToken = decrypt(project.gsc_refresh_token_encrypted);
        if (!refreshToken) {
          console.error(`Error: Decrypted token is empty for project ${project.id}`);
          continue;
        }

        // 3. Refresh Access Token
        const accessToken = await refreshAccessToken(refreshToken);

        // 4. Find the matching Site Property URL in Google Search Console
        const siteUrl = await findGscSiteProperty(accessToken, project.domain_url);
        if (!siteUrl) {
          console.warn(`No active GSC property matches domain "${project.domain_url}". Skipping.`);
          continue;
        }

        console.log(`Using matching GSC Site Property URL: "${siteUrl}"`);

        // 5. Fetch GSC analytics with South Africa country filter
        const gscRows = await fetchGscSearchAnalytics(accessToken, siteUrl, startDateStr, endDateStr);
        console.log(`Retrieved ${gscRows.length} search performance records for South Africa.`);

        if (gscRows.length > 0) {
          // 6. Map rows to our database schema
          const performancePayload = gscRows.map((row: any) => {
            const keyword = row.keys[0];
            const date = row.keys[1];
            
            return {
              project_id: project.id,
              keyword,
              clicks: row.clicks || 0,
              impressions: row.impressions || 0,
              ctr: row.ctr || 0.0,
              position: row.position || 0.0,
              date
            };
          });

          // Insert/Upsert GSC performance records without duplication crashes
          // The table has standard unique constraint: unique_perf_project_keyword_date (project_id, keyword, date)
          const { error: upsertError } = await supabase
            .from('seo_keyword_performance')
            .upsert(performancePayload, { onConflict: 'project_id,keyword,date' });

          if (upsertError) {
            console.error(`Performance upsert failure: ${upsertError.message}`);
            throw upsertError;
          }

          // Insert averages into seo_rank_history for daily keyword ranks
          const rankHistoryPayload = performancePayload.map((perf) => ({
            project_id: perf.project_id,
            keyword: perf.keyword,
            rank: Math.round(perf.position),
            date: perf.date
          }));

          const { error: rankHistoryError } = await supabase
            .from('seo_rank_history')
            .upsert(rankHistoryPayload, { onConflict: 'project_id,keyword,date' as any }); 
            // Note: Since seo_rank_history is partitioned by date, we can upsert or let it insert cleanly

          if (rankHistoryError) {
            console.warn(`Soft warning: Rank history inserts: ${rankHistoryError.message}`);
          }

          // 7. Calculate aggregate totals to cache in seo_projects
          let totalClicks = 0;
          let totalImpressions = 0;
          let sumCtr = 0;
          let sumPosition = 0;

          performancePayload.forEach((row) => {
            totalClicks += row.clicks;
            totalImpressions += row.impressions;
            sumCtr += row.ctr;
            sumPosition += row.position;
          });

          const totalRows = performancePayload.length;
          const avgCtr = totalRows > 0 ? (sumCtr / totalRows) : 0.0;
          const avgPosition = totalRows > 0 ? (sumPosition / totalRows) : 0.0;

          // Update cache on project level
          const { error: cacheError } = await supabase
            .from('seo_projects')
            .update({
              cached_gsc_clicks: totalClicks,
              cached_gsc_impressions: totalImpressions,
              cached_gsc_ctr: avgCtr,
              cached_gsc_position: avgPosition,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', project.id);

          if (cacheError) {
            console.error(`Failed to update project aggregation cache: ${cacheError.message}`);
          } else {
            console.log(`Updated cache: Clicks: ${totalClicks} | Impressions: ${totalImpressions} | Avg Pos: ${avgPosition.toFixed(2)}`);
          }
        } else {
          // No rows returned, update last synced at anyway
          await supabase
            .from('seo_projects')
            .update({
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', project.id);
        }

        processedCount++;
      } catch (err: any) {
        console.error(`Error processing project sync for ${project.id}:`, err.message);
      }
    }

    return { status: 'success', synced: processedCount };
  } catch (err: any) {
    console.error('GSC Synchronization Worker failed:', err.message);
    return { status: 'failure', error: err.message };
  } finally {
    console.log('--- GOOGLE SEARCH CONSOLE SYNCHRONIZATION WORKER COMPLETED ---');
  }
}

// Support direct CLI invocation
if (require.main === module) {
  runGscSync().then(console.log).catch(console.error);
}
