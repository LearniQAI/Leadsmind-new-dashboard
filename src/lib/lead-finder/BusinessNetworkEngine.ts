export class BusinessNetworkEngine {
  /**
   * Identifies chains, franchises, and network groups by analyzing a batch of leads.
   * Looks for repeated names or identical root domains.
   */
  public static detectNetworks(leads: any[]): any[] {
    const networks: Record<string, any[]> = {};
    const domainMap: Record<string, any[]> = {};

    leads.forEach(lead => {
      // 1. Group by exact business name (chains/franchises)
      const nameKey = lead.business_name.toLowerCase().trim();
      if (!networks[nameKey]) networks[nameKey] = [];
      networks[nameKey].push(lead);

      // 2. Group by domain (sister companies / holding groups)
      if (lead.website) {
        try {
          const domain = new URL(lead.website).hostname.replace('www.', '');
          if (!domainMap[domain]) domainMap[domain] = [];
          domainMap[domain].push(lead);
        } catch (e) {
          // invalid url
        }
      }
    });

    const detectedNetworks = [];

    // Extract name-based networks (2+ locations)
    for (const [name, members] of Object.entries(networks)) {
      if (members.length > 1) {
        detectedNetworks.push({
          network_name: `${members[0].business_name} (Locations)`,
          confidence_score: 95,
          members: members,
          type: 'Franchise/Chain'
        });
      }
    }

    // Extract domain-based networks (2+ locations not already caught)
    for (const [domain, members] of Object.entries(domainMap)) {
      if (members.length > 1) {
        const alreadyTracked = detectedNetworks.some(n => n.members.some((m: any) => m.id === members[0].id));
        if (!alreadyTracked) {
          detectedNetworks.push({
            network_name: `${domain} Network`,
            confidence_score: 85,
            members: members,
            type: 'Shared Domain Group'
          });
        }
      }
    }

    return detectedNetworks;
  }
}
