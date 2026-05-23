'use server';

import { createServerClient } from '@/lib/supabase/server';


export async function getTerritoryMapData() {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return { success: false, error: 'Unauthorized' };

  // Fetch a broad sample of leads to simulate the "map viewport"
  // In a real map, you'd query by bounding box using PostGIS, 
  // but for the deterministic MVP we group by the `location` text column.
  const { data: leads, error } = await supabase
    .from('lead_finder_results')
    .select('*')
    .limit(200); // Simulate query limits

  if (error) return { success: false, error: error.message };

  if (!leads || leads.length === 0) return { success: true, data: { territories: [], networks: [], leads: [] } };

  // Group by location (territory)
  const territoriesMap: Record<string, any[]> = {};
  leads.forEach(lead => {
    const loc = lead.location || 'Unknown Region';
    if (!territoriesMap[loc]) territoriesMap[loc] = [];
    territoriesMap[loc].push(lead);
  });

  const territories = Object.entries(territoriesMap).map(([region, tLeads]) => {
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
      leads // pass raw leads for the map layer (UI)
    } 
  };
}
