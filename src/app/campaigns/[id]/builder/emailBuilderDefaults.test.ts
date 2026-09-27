import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parsePersonalTokens } from '@/lib/builder/emailRenderer';

// Regression guard for the 2026-09-27 deliverability audit's merge-tag finding: a real campaign
// rendered "Hi Zain new, discover the latest additions to the your company dashboard." — the
// {{company}} merge tag's no-data fallback is the phrase "your company" (parsePersonalTokens),
// and the seed copy below used to say "the {{company}} dashboard" / "The {{company}} Team",
// producing "the your company dashboard" / "The your company Team". Reads the actual source
// (not a copy pasted into the test) so an edit to these defaults can't silently reintroduce it.
const source = readFileSync(join(__dirname, 'EmailBuilderClient.tsx'), 'utf8');

function defaultOf(field: 'subheadline' | 'body'): string {
  const match = source.match(new RegExp(`${field}: (['"])((?:\\\\.|(?!\\1).)*)\\1`));
  if (!match) throw new Error(`Couldn't find the default ${field} template in EmailBuilderClient.tsx`);
  // The source literal itself may use \n escapes; only the tokens matter for this test, not that.
  return match[2];
}

describe("EmailBuilderClient's default block content, with no contact data (every merge tag on its fallback)", () => {
  it('hero subheadline reads correctly with the {{company}} fallback', () => {
    const rendered = parsePersonalTokens(defaultOf('subheadline'));
    expect(rendered).not.toMatch(/the your company/i);
    expect(rendered).toContain("your company's dashboard");
  });

  it('text block sign-off reads correctly with the {{company}} fallback', () => {
    const rendered = parsePersonalTokens(defaultOf('body'));
    expect(rendered).not.toMatch(/the your company/i);
    expect(rendered).toContain("your company's Team");
  });

  it('both also read correctly with a real company name substituted', () => {
    const contact = { company: 'Acme Corp' };
    expect(parsePersonalTokens(defaultOf('subheadline'), contact)).toContain("Acme Corp's dashboard");
    expect(parsePersonalTokens(defaultOf('body'), contact)).toContain("Acme Corp's Team");
  });
});
