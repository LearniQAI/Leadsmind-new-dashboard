import { describe, expect, it } from 'vitest';
import { courseLandingUrl, courseOrigin } from './coursePublicUrl';
import { websiteLiveUrl } from './websiteUrl';

const platformOrigin = 'https://www.leadsmind.io';

describe('courseLandingUrl / courseOrigin', () => {
  it('bound course uses https://{domain}/{url_path}, even with no slug', () => {
    expect(courseLandingUrl({ hostname: 'eslteflhub.com', urlPath: 'masterclass-in-english', slug: null, platformOrigin }))
      .toBe('https://eslteflhub.com/masterclass-in-english');
  });
  it('unbound course uses the platform /courses/{slug}', () => {
    expect(courseLandingUrl({ hostname: null, urlPath: null, slug: 'intro', platformOrigin }))
      .toBe('https://www.leadsmind.io/courses/intro');
  });
  it('has no URL when neither a bound path nor a slug exists', () => {
    expect(courseLandingUrl({ hostname: null, urlPath: 'x', slug: null, platformOrigin })).toBeNull();
  });
  it('origin follows the bound domain, else the platform', () => {
    expect(courseOrigin({ hostname: 'eslteflhub.com', platformOrigin })).toBe('https://eslteflhub.com');
    expect(courseOrigin({ hostname: null, platformOrigin: 'https://x.io/' })).toBe('https://x.io');
  });
});

describe('websiteLiveUrl', () => {
  const base = { subdomain: 'shop', workspaceSlug: 'acme', platformOrigin };
  it('uses the verified custom domain when published', () => {
    expect(websiteLiveUrl({ ...base, isPublished: true, domains: [{ domain_name: 'shop.acme.com', verified: true, ownership_verified_at: 'x' }] }))
      .toBe('https://shop.acme.com');
  });
  it('ignores unverified domains and unpublished sites, using /p/{ws}/{sub}', () => {
    expect(websiteLiveUrl({ ...base, isPublished: true, domains: [{ domain_name: 'a.com', verified: false }] }))
      .toBe('https://www.leadsmind.io/p/acme/shop');
    expect(websiteLiveUrl({ ...base, isPublished: false, domains: [{ domain_name: 'a.com', verified: true, ownership_verified_at: 'x' }] }))
      .toBe('https://www.leadsmind.io/p/acme/shop');
  });
});
