// Extracted out of src/middleware.ts (edge runtime) so server actions/components can share
// the exact same "is this the platform's own bare domain, not a tenant custom domain/
// subdomain" check — previously only middleware knew this list, so the equivalent default-
// domain fallback that already exists for courses (see middleware.ts's "1b. Default-domain
// public course URL" block) had no counterpart for blog posts, which is what let
// leadsmind.io/blog/{slug} 500 for any workspace without a configured custom domain.
export const PLATFORM_HOSTS = new Set([
  'leadsmind.com',
  'www.leadsmind.com',
  'app.leadsmind.com',
  'leadsmind.io',
  'www.leadsmind.io',
  'app.leadsmind.io',
  'localhost',
]);

export function isPlatformDefaultHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return PLATFORM_HOSTS.has(host.split(':')[0].toLowerCase());
}
