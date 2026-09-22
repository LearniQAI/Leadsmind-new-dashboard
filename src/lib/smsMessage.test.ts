import { describe, it, expect } from 'vitest';
import { renderSmsBody, hasMergeTags } from '@/lib/smsMessage';

describe('renderSmsBody', () => {
  const ada = { first_name: 'Ada', last_name: 'Lovelace', company: 'Analytical Co', email: 'ada@x.com' };

  it('resolves the standard tags and the {{contact.*}} spelling for each recipient', () => {
    expect(renderSmsBody('Hi {{first_name}} {{last_name}} at {{company}}', ada)).toBe('Hi Ada Lovelace at Analytical Co');
    expect(renderSmsBody('Hi {{contact.first_name}} ({{ email }})', ada)).toBe('Hi Ada (ada@x.com)');
  });

  it('is case-insensitive and tolerates spaces inside the braces (same resolver as email)', () => {
    expect(renderSmsBody('{{ FIRST_NAME }}!', ada)).toBe('Ada!');
  });

  it('never leaves literal braces for a customer: an unknown tag becomes empty', () => {
    const out = renderSmsBody('Hi {{first_name}}, {{no_such_tag}}code', ada);
    expect(out).toBe('Hi Ada, code');
    expect(out).not.toContain('{{');
  });

  it('uses the same fallbacks as email for a contact with no name / company', () => {
    expect(renderSmsBody('Hi {{first_name}} from {{company}}', {})).toBe('Hi Valued Customer from your company');
  });

  it('inserts values as plain text (an SMS is not HTML): no escaping', () => {
    expect(renderSmsBody('{{first_name}}', { first_name: "O'Brien & <Co>" })).toBe("O'Brien & <Co>");
  });

  it('leaves a message without tags exactly as written', () => {
    expect(renderSmsBody('Flash sale today only.', ada)).toBe('Flash sale today only.');
    expect(hasMergeTags('Flash sale')).toBe(false);
    expect(hasMergeTags('Hi {{first_name}}')).toBe(true);
  });
});
