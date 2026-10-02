import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import mentor from '@/lib/builder/__fixtures__/mentorPage.json';

vi.mock('react', async (orig) => ({ ...(await orig<any>()), cache: (f: any) => f }));
vi.mock('next/navigation', () => ({ useParams: () => ({ pageId: 'p', id: 'p' }), usePathname: () => '/p/x/y', useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}), supabase: {} }));

import PublishedPageRenderer from './PublishedPageRenderer';

const text = (h: string) => h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const render = (content: unknown) => text(renderToString(<PublishedPageRenderer content={content} websiteData={{ config: {} }} pages={[]} pageId="p1" />));

afterEach(() => vi.restoreAllMocks());

describe('PublishedPageRenderer content forms', () => {
  it('renders real Mentor content stored as an OBJECT (the editor shape that used to go black)', () => {
    const out = render(mentor);
    expect(out.length).toBeGreaterThan(3000);
    expect(out).toContain('From Beginner To Pro');
    expect(out).toContain('WELCOME TO ONLINE COACHING');
  });

  it('object, JSON string and double-encoded render identical text', () => {
    const o = render(mentor);
    expect(render(JSON.stringify(mentor))).toBe(o);
    expect(render(JSON.stringify(JSON.stringify(mentor)))).toBe(o);
    expect(o.length).toBeGreaterThan(3500); // string-form length measured earlier: 3563
  });

  it('empty / null content renders the blank canvas, not an error', () => {
    for (const v of [null, undefined, '', '{}']) expect(render(v)).not.toContain("couldn't be displayed");
  });

  it('unparseable content shows a neutral light message and logs without the body', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderToString(<PublishedPageRenderer content={'SECRET{not json'} websiteData={{ config: {} }} pages={[]} pageId="p9" />);
    expect(html).toContain('This page couldn&#x27;t be displayed');
    expect(html).toContain('bg-white');
    expect(html).not.toContain('050508');
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain('p9');
    expect(logged).not.toContain('SECRET');
  });
});
