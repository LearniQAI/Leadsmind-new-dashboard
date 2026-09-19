import { describe, it, expect } from 'vitest';
import {
  CUSTOM_DOMAIN_PASSTHROUGH_FILES,
  CUSTOM_DOMAIN_PASSTHROUGH_ROOTS,
  isCustomDomainPassthrough,
  isReservedCoursePath,
} from './customDomainRoutes';

describe('isCustomDomainPassthrough', () => {
  it.each([
    '/blog', '/blog/a-post', '/rss.xml', '/sitemap.xml', '/robots.txt', '/checkout/abc',
    '/preview/courses/abc', '/certificates/verify/abc', '/public/forms/abc', '/book/my-cal',
    '/api/anything', '/_next/data/x.json', '/student', '/student/courses/1', '/portal/dashboard',
    '/auth/signin-basic', '/meet/abc', '/widget/reviews', '/BLOG',
  ])('passes %s through', (path) => expect(isCustomDomainPassthrough(path)).toBe(true));

  it.each([
    '/', '/photography', '/dashboard', '/settings', '/contacts', '/students', '/blogger',
    '/courses/x', '/rss.xml/extra', '/privacy-policy',
  ])('does not pass %s through', (path) => expect(isCustomDomainPassthrough(path)).toBe(false));
});

describe('isReservedCoursePath', () => {
  it('reserves every allowlisted root and file', () => {
    for (const word of [...CUSTOM_DOMAIN_PASSTHROUGH_ROOTS, ...CUSTOM_DOMAIN_PASSTHROUGH_FILES]) {
      expect(isReservedCoursePath(word)).toBe(true);
    }
    expect(isReservedCoursePath('/Blog/')).toBe(true);
  });

  it('reserves the words named in the requirement', () => {
    for (const w of ['blog', 'student', 'portal', 'auth', 'checkout', 'preview', 'certificates', 'public', 'book', 'meet', 'widget', 'api']) {
      expect(isReservedCoursePath(w)).toBe(true);
    }
  });

  it('allows ordinary course paths', () => {
    for (const w of ['photography', 'excel101x', '12345678', 'my-course', 'students', 'blogging-101']) {
      expect(isReservedCoursePath(w)).toBe(false);
    }
  });
});
