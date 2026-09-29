// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getParagraphListStyle, setParagraphListStyle } from './paragraphListStyle';

describe('getParagraphListStyle', () => {
  it('reads none / bullet / number from the stored HTML', () => {
    expect(getParagraphListStyle('<p>Plain text</p>')).toBe('none');
    expect(getParagraphListStyle('<ul><li>a</li><li>b</li></ul>')).toBe('bullet');
    expect(getParagraphListStyle('<ol><li>a</li><li>b</li></ol>')).toBe('number');
    expect(getParagraphListStyle('')).toBe('none');
    expect(getParagraphListStyle('<p>a</p><p>b</p>')).toBe('none'); // multiple paragraphs, not a single list
  });
});

describe('setParagraphListStyle', () => {
  it('turns a single paragraph into a bullet list', () => {
    expect(setParagraphListStyle('<p>Buy milk</p>', 'bullet')).toBe('<ul><li>Buy milk</li></ul>');
  });

  it('turns multiple paragraphs into one list, one item per paragraph', () => {
    const out = setParagraphListStyle('<p>First</p><p>Second</p><p>Third</p>', 'number');
    expect(out).toBe('<ol><li>First</li><li>Second</li><li>Third</li></ol>');
  });

  it('preserves inline formatting inside each item', () => {
    const out = setParagraphListStyle('<p>Hello <strong>world</strong></p>', 'bullet');
    expect(out).toBe('<ul><li>Hello <strong>world</strong></li></ul>');
  });

  it('switching bullet <-> number is a lossless tag rename (nested content untouched)', () => {
    const bullet = '<ul><li>a</li><li>b <a href="/x">link</a></li></ul>';
    const asNumber = setParagraphListStyle(bullet, 'number');
    expect(asNumber).toBe('<ol><li>a</li><li>b <a href="/x">link</a></li></ol>');
    expect(setParagraphListStyle(asNumber, 'bullet')).toBe(bullet);
  });

  it('is a no-op when already the target style', () => {
    const bullet = '<ul><li>a</li></ul>';
    expect(setParagraphListStyle(bullet, 'bullet')).toBe(bullet);
  });

  it('converts a list back to plain paragraphs (none)', () => {
    expect(setParagraphListStyle('<ul><li>a</li><li>b</li></ul>', 'none')).toBe('<p>a</p><p>b</p>');
  });

  it('a nested sub-list survives a bullet<->number rename', () => {
    const html = '<ul><li>Parent<ul><li>Child</li></ul></li></ul>';
    const asNumber = setParagraphListStyle(html, 'number');
    expect(asNumber).toContain('<li>Parent<ul><li>Child</li></ul></li>');
  });

  it('empty input is returned unchanged', () => {
    expect(setParagraphListStyle('', 'bullet')).toBe('');
    expect(setParagraphListStyle('   ', 'number')).toBe('   ');
  });

  it('round-trips through none without losing text', () => {
    const original = '<p>One</p><p>Two</p>';
    const bulleted = setParagraphListStyle(original, 'bullet');
    const back = setParagraphListStyle(bulleted, 'none');
    expect(back).toBe(original);
  });

  // TipTap always keeps a trailing empty paragraph after a top-level list (its own invariant, not
  // user content — real getHTML() output looks like "<ul>...</ul><p></p>"). It must never be treated
  // as a second top-level block, and never turned into a bogus item.
  describe('TipTap\'s trailing filler paragraph', () => {
    const withFiller = '<p>First</p><p>Second</p><p></p>';

    it('getParagraphListStyle ignores a trailing filler paragraph after a real list', () => {
      expect(getParagraphListStyle('<ul><li>a</li></ul><p></p>')).toBe('bullet');
      expect(getParagraphListStyle('<ol><li>a</li></ol><p><br></p>')).toBe('number');
    });

    it('a Select-All that reaches the trailing filler can turn it into a genuinely empty <li> — dropped, not resurfaced as a blank paragraph', () => {
      const withEmptyItem = '<ul><li><p>Alpha</p></li><li><p>Bravo</p></li><li><p><br></p></li></ul><p></p>';
      expect(setParagraphListStyle(withEmptyItem, 'none')).toBe('<p>Alpha</p><p>Bravo</p>');
    });

    it('a genuinely mixed block (two real top-level nodes) is still "none"', () => {
      expect(getParagraphListStyle('<ul><li>a</li></ul><p>Real text</p>')).toBe('none');
    });

    it('setParagraphListStyle drops the filler rather than turning it into an empty item', () => {
      expect(setParagraphListStyle(withFiller, 'bullet')).toBe('<ul><li>First</li><li>Second</li></ul>');
    });

    it('a list with a trailing filler still renames losslessly between bullet and number', () => {
      const bulletWithFiller = '<ul><li>a</li></ul><p></p>';
      expect(setParagraphListStyle(bulletWithFiller, 'number')).toBe('<ol><li>a</li></ol>');
    });

    it('already the target style: returned verbatim (harmless — TipTap re-adds its own filler on load)', () => {
      const bulletWithFiller = '<ul><li>a</li></ul><p></p>';
      expect(setParagraphListStyle(bulletWithFiller, 'bullet')).toBe(bulletWithFiller);
    });
  });
});
