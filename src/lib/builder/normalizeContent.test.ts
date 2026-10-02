import { afterEach, describe, expect, it, vi } from 'vitest';
import { contentToJsonString, MAX_CONTENT_CHARS, normalizeContent, toStoredContent } from './normalizeContent';
import { BLANK_PAGE } from './templates';

const TREE = { ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: {}, nodes: [] } };

afterEach(() => vi.restoreAllMocks());

describe('normalizeContent', () => {
  it('passes an object through (the editor-saved shape)', () => {
    const r = normalizeContent(TREE);
    expect(r).toMatchObject({ status: 'ok', source: 'object' });
    if (r.status === 'ok') expect(r.tree).toBe(TREE);
  });

  it('parses a JSON string (the template / server-action shape)', () => {
    const r = normalizeContent(JSON.stringify(TREE));
    expect(r).toMatchObject({ status: 'ok', source: 'string' });
    if (r.status === 'ok') expect(r.tree).toEqual(TREE);
  });

  it('parses the blank-page constant', () => {
    expect(normalizeContent(BLANK_PAGE).status).toBe('ok');
  });

  it('unwraps a double-encoded string', () => {
    const r = normalizeContent(JSON.stringify(JSON.stringify(TREE)));
    expect(r).toMatchObject({ status: 'ok', source: 'double-encoded' });
    if (r.status === 'ok') expect(r.tree).toEqual(TREE);
  });

  it('unwraps a triple-encoded string but not an unbounded one', () => {
    let s: string = JSON.stringify(TREE);
    for (let i = 0; i < 2; i++) s = JSON.stringify(s);
    expect(normalizeContent(s).status).toBe('ok');
    for (let i = 0; i < 5; i++) s = JSON.stringify(s);
    expect(normalizeContent(s, { log: false })).toMatchObject({ status: 'invalid' });
  });

  it('treats null, undefined, empty and whitespace as empty', () => {
    for (const v of [null, undefined, '', '   ', '\n\t', '{}', {}, 'null']) {
      expect(normalizeContent(v).status, JSON.stringify(v)).toBe('empty');
    }
  });

  it('reports invalid JSON without throwing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(normalizeContent('{"ROOT": {', { pageId: 'p1', where: 'test' })).toEqual({ status: 'invalid', tree: null, reason: 'not-json' });
    expect(normalizeContent('not json at all', { log: false })).toMatchObject({ status: 'invalid', reason: 'not-json' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('rejects non-object payloads', () => {
    expect(normalizeContent('[1,2,3]', { log: false })).toMatchObject({ status: 'invalid', reason: 'not-an-object' });
    expect(normalizeContent([1, 2], { log: false })).toMatchObject({ status: 'invalid', reason: 'not-an-object' });
    expect(normalizeContent('42', { log: false })).toMatchObject({ status: 'invalid', reason: 'not-an-object' });
    expect(normalizeContent(42, { log: false })).toMatchObject({ status: 'invalid', reason: 'unsupported-type' });
    expect(normalizeContent(true, { log: false })).toMatchObject({ status: 'invalid', reason: 'unsupported-type' });
  });

  it('rejects a non-empty tree with no ROOT', () => {
    expect(normalizeContent({ hero: { type: { resolvedName: 'Section' } } }, { log: false })).toMatchObject({ status: 'invalid', reason: 'missing-root' });
    expect(normalizeContent('{"ROOT": "nope"}', { log: false })).toMatchObject({ status: 'invalid', reason: 'missing-root' });
  });

  it('does not parse huge input and does not throw', () => {
    const huge = 'x'.repeat(MAX_CONTENT_CHARS + 1);
    expect(normalizeContent(huge, { log: false })).toEqual({ status: 'invalid', tree: null, reason: 'too-large' });
  });

  it('parses a large but legitimate tree', () => {
    const big: Record<string, any> = { ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: {}, nodes: [] } };
    for (let i = 0; i < 20000; i++) big[`n${i}`] = { type: { resolvedName: 'Text' }, props: { text: 'lorem ipsum '.repeat(10) }, nodes: [] };
    const s = JSON.stringify(big);
    expect(s.length).toBeGreaterThan(2_000_000);
    expect(normalizeContent(s).status).toBe('ok');
  });

  it('logs only safe fields, never the content body', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const secret = 'SECRET-PAGE-BODY-<<not json';
    normalizeContent(secret, { pageId: 'page-123', where: 'PublishedPageRenderer' });
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(spy.mock.calls[0]);
    expect(logged).toContain('page-123');
    expect(logged).toContain('PublishedPageRenderer');
    expect(logged).toContain('not-json');
    expect(logged).not.toContain('SECRET-PAGE-BODY');
  });

  it('does not log for ok or empty input', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    normalizeContent(TREE);
    normalizeContent(JSON.stringify(TREE));
    normalizeContent(null);
    normalizeContent('');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('toStoredContent (canonical write shape)', () => {
  it('returns an object for a string, an object and a double-encoded string', () => {
    expect(toStoredContent(JSON.stringify(TREE))).toEqual(TREE);
    expect(toStoredContent(TREE)).toEqual(TREE);
    expect(toStoredContent(JSON.stringify(JSON.stringify(TREE)))).toEqual(TREE);
    expect(typeof toStoredContent(BLANK_PAGE)).toBe('object');
  });

  it('returns input it cannot understand unchanged, so a writer never destroys data', () => {
    expect(toStoredContent('garbage{')).toBe('garbage{');
    expect(toStoredContent(null)).toBe(null);
    expect(toStoredContent('')).toBe('');
  });
});

describe('contentToJsonString', () => {
  it('serialises an object or string tree, and returns null otherwise', () => {
    expect(JSON.parse(contentToJsonString(TREE)!)).toEqual(TREE);
    expect(JSON.parse(contentToJsonString(JSON.stringify(TREE))!)).toEqual(TREE);
    expect(contentToJsonString(null)).toBeNull();
    expect(contentToJsonString('garbage', { log: false })).toBeNull();
  });
});
