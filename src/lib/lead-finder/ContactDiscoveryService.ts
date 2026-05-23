import { ContactData, ContactConfidenceEngine } from './ContactConfidenceEngine';

export class ContactDiscoveryService {
  /**
   * Safe, heuristic-based mock discovery for MVP.
   * Discovers realistic contacts (Founders, Marketing, Ops) based on business context.
   */
  public static async discoverContacts(businessName: string, domain?: string) {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!businessName) return [];

    const isCorporate = /llc|inc|group|tech|agency|software/i.test(businessName);
    const domainPart = domain ? new URL(domain).hostname.replace('www.', '') : businessName.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com';

    const contacts: ContactData[] = [];

    // Founder / CEO
    contacts.push({
      first_name: 'Alex',
      last_name: 'Morgan',
      title: isCorporate ? 'Chief Executive Officer' : 'Owner',
      department: 'Executive',
      email: `alex@${domainPart}`,
      linkedin_url: `https://linkedin.com/in/alex-morgan-${Date.now()}`
    });

    // Operations / Manager
    contacts.push({
      first_name: 'Jordan',
      last_name: 'Lee',
      title: isCorporate ? 'VP of Operations' : 'General Manager',
      department: 'Operations',
      email: `jordan.l@${domainPart}`,
      phone: '+1 (555) 019-2834'
    });

    if (isCorporate) {
      // Marketing
      contacts.push({
        first_name: 'Sam',
        last_name: 'Taylor',
        title: 'Director of Marketing',
        department: 'Marketing',
        email: `marketing@${domainPart}`,
        linkedin_url: `https://linkedin.com/in/sam-taylor-mktg`
      });
    }

    // Map and score
    return contacts.map(c => {
      const confidence = ContactConfidenceEngine.calculateConfidence(c);
      return {
        ...c,
        confidence_score: confidence.score,
        confidence_level: confidence.level
      };
    });
  }
}
