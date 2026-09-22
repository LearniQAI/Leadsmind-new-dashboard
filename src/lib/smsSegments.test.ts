import { describe, it, expect } from 'vitest';
import { analyzeSms, hasOptOutWording, STOP_WORDING, MAX_SMS_BODY_CHARS } from '@/lib/smsSegments';

const a = (n: number) => 'a'.repeat(n);

describe('analyzeSms: GSM-7', () => {
  it('160 characters is one segment; splitting uses 153 per segment', () => {
    expect(analyzeSms(a(160))).toMatchObject({ encoding: 'GSM-7', length: 160, segments: 1 });
    expect(analyzeSms(a(161)).segments).toBe(2);
    expect(analyzeSms(a(306)).segments).toBe(2);
    expect(analyzeSms(a(307)).segments).toBe(3);
  });

  it('extended characters ( ^ { } \\ [ ] ~ | € ) take two slots', () => {
    expect(analyzeSms('€'.repeat(80))).toMatchObject({ encoding: 'GSM-7', length: 160, segments: 1 });
    expect(analyzeSms('€'.repeat(81))).toMatchObject({ length: 162, segments: 2 });
  });

  it('an empty message is 0 segments, plain text is GSM-7 with no offending characters', () => {
    expect(analyzeSms('').segments).toBe(0);
    expect(analyzeSms('Hello, world! 123')).toMatchObject({ encoding: 'GSM-7', nonGsmChars: [] });
  });
});

describe('analyzeSms: Unicode (emoji / non-GSM) drops to 70 per segment', () => {
  it('one emoji switches the WHOLE message to Unicode and is counted as 2 code units', () => {
    expect(analyzeSms('Hi 😀')).toMatchObject({ encoding: 'Unicode', length: 5, segments: 1, nonGsmChars: ['😀'] });
  });

  it('a 100-character message costs 1 segment as GSM-7 but 2 as soon as it holds a curly apostrophe', () => {
    expect(analyzeSms(a(100)).segments).toBe(1);
    const withQuote = analyzeSms(a(99) + '’');
    expect(withQuote).toMatchObject({ encoding: 'Unicode', length: 100, segments: 2, nonGsmChars: ['’'] });
  });

  it('70 fits one segment, 71 splits into 67-per-segment parts', () => {
    expect(analyzeSms(a(69) + '✓')).toMatchObject({ length: 70, segments: 1 });
    expect(analyzeSms(a(70) + '✓')).toMatchObject({ length: 71, segments: 2 });
    expect(analyzeSms(a(133) + '✓').segments).toBe(2); // 134 = 2 * 67
    expect(analyzeSms(a(134) + '✓').segments).toBe(3);
  });

  it('non-Latin scripts and accented letters outside GSM are flagged', () => {
    expect(analyzeSms('Привет').encoding).toBe('Unicode');
    expect(analyzeSms('café').encoding).toBe('GSM-7'); // é is in the GSM alphabet
    expect(analyzeSms('ç ã').encoding).toBe('Unicode'); // ã is not
  });
});

describe('opt-out wording', () => {
  it('recognises any mention of STOP, and the suggested wording satisfies it', () => {
    expect(hasOptOutWording('Sale today! Reply STOP to opt out.')).toBe(true);
    expect(hasOptOutWording('text stop to end')).toBe(true);
    expect(hasOptOutWording('Sale today!')).toBe(false);
    expect(hasOptOutWording('the bus stopped')).toBe(false);
    expect(hasOptOutWording(STOP_WORDING)).toBe(true);
  });

  it('the server-side limit is exported for both UI and action', () => {
    expect(MAX_SMS_BODY_CHARS).toBe(320);
  });
});
