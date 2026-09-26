import { describe, it, expect } from 'vitest';
import { normalizeMessageId, parseMessageIdList, buildEmailMessageRow } from './emailMessageStore';

describe('normalizeMessageId', () => {
  it('strips angle brackets and surrounding whitespace', () => {
    expect(normalizeMessageId(' <CAB+x=1@mail.gmail.com>\r\n')).toBe('CAB+x=1@mail.gmail.com');
    expect(normalizeMessageId('abc@example.com')).toBe('abc@example.com');
  });

  it('keeps case (the local part is case-sensitive)', () => {
    expect(normalizeMessageId('<AbC@x>')).not.toBe(normalizeMessageId('<abc@x>'));
  });

  it('returns null for missing or unusable values', () => {
    expect(normalizeMessageId(null)).toBeNull();
    expect(normalizeMessageId('   ')).toBeNull();
    expect(normalizeMessageId('two words')).toBeNull();
  });
});

describe('parseMessageIdList', () => {
  it('keeps References order and drops repeats', () => {
    expect(parseMessageIdList('<a@x> <b@x>\r\n <a@x> <c@x>')).toEqual(['a@x', 'b@x', 'c@x']);
  });

  it('accepts un-bracketed ids', () => {
    expect(parseMessageIdList('a@x b@x')).toEqual(['a@x', 'b@x']);
  });

  it('empty for nothing', () => {
    expect(parseMessageIdList(undefined)).toEqual([]);
  });
});

describe('buildEmailMessageRow', () => {
  it('normalises headers and addresses into the messages columns', () => {
    const row = buildEmailMessageRow({
      workspaceId: 'w', conversationId: 'c', direction: 'inbound', text: 'hi',
      from: { address: ' Jane@Example.COM ', name: 'Jane ' },
      to: [{ address: 'Me@x.com' }, { address: '' }],
      messageId: '<M1@x>', inReplyTo: '<M0@x>', references: '<M-1@x> <M0@x>',
    });
    expect(row).toMatchObject({
      email_from_address: 'jane@example.com', email_from_name: 'Jane', sender_handle: 'jane@example.com',
      email_to: [{ address: 'me@x.com', name: null }], email_cc: [],
      rfc_message_id: 'M1@x', in_reply_to: 'M0@x', email_references: ['M-1@x', 'M0@x'],
      status: 'delivered',
    });
  });
});
