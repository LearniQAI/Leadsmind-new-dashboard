import { parse } from 'tldts';

export interface DnsGuidance {
  /** 'apex' = the registrable domain itself (example.com, example.co.uk); otherwise 'subdomain'. */
  domainType: 'apex' | 'subdomain';
  /** The registrable domain per the Public Suffix List (example.co.uk for shop.example.co.uk). */
  registrableDomain: string;
  /** Host to enter at the DNS provider for the CNAME: '@' for apex, else the label(s) left of the registrable domain. */
  recordHost: string;
  /** Host to enter for the TXT ownership record, relative to the same zone. */
  txtHost: string;
}

const TXT_PREFIX = '_leadsmind-verify';

/**
 * Classify a hostname with the real Public Suffix List (tldts) so multi-part suffixes such as
 * co.uk / com.au are handled — a naive "two labels = apex" test calls example.co.uk a subdomain
 * and shop.example.com an apex-adjacent host wrongly. Returns null for anything that isn't a
 * real registrable hostname (bare TLDs, IPs, localhost, single labels).
 */
export function describeDns(hostname: string): DnsGuidance | null {
  const host = hostname.trim().toLowerCase();
  const parsed = parse(host, { allowPrivateDomains: false });
  if (parsed.isIp || !parsed.domain || !parsed.hostname) return null;

  const registrableDomain = parsed.domain;
  const isApex = parsed.hostname === registrableDomain;
  const recordHost = isApex ? '@' : parsed.hostname.slice(0, -(registrableDomain.length + 1));
  return {
    domainType: isApex ? 'apex' : 'subdomain',
    registrableDomain,
    recordHost,
    txtHost: isApex ? TXT_PREFIX : `${TXT_PREFIX}.${recordHost}`,
  };
}

/** Strip scheme/path/port/trailing dot from user input; the result is a bare lowercase hostname. */
export function normalizeHostnameInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}
