// The real, working public URL of a website-builder site — what the Website Manager shows.
// A site with a verified custom domain (same rule resolveWebsiteHost applies: verified, ownership
// proven, site published) is served at https://{domain}; every other site is served at
// {platformOrigin}/p/{workspaceSlug}/{subdomain}. There is no {subdomain}.leadsmind.io host.

export interface WebsiteUrlInput {
  subdomain?: string | null;
  workspaceSlug?: string | null;
  isPublished?: boolean | null;
  domains?: Array<{ domain_name: string; verified?: boolean | null; ownership_verified_at?: string | null }> | null;
  platformOrigin: string;
}

export function websiteLiveUrl(input: WebsiteUrlInput): string | null {
  const { subdomain, workspaceSlug, isPublished, domains, platformOrigin } = input;
  const custom = isPublished
    ? (domains ?? []).find((d) => d.verified && d.ownership_verified_at)
    : undefined;
  if (custom) return `https://${custom.domain_name}`;
  if (subdomain && workspaceSlug) return `${platformOrigin.replace(/\/+$/, '')}/p/${workspaceSlug}/${subdomain}`;
  return null;
}
