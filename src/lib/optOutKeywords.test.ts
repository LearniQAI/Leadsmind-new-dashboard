import { describe, expect, it } from 'vitest';
import { classifyWhatsAppKeyword, normalizeKeyword, WHATSAPP_STOP_KEYWORDS } from './optOutKeywords';

describe('WhatsApp opt-out keywords', () => {
  it.each(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REMOVE'])('%s is a STOP keyword', (k) => {
    expect(classifyWhatsAppKeyword(k)).toBe('stop');
  });
  it.each(['stop', 'Stop', '  stop  ', 'Stop.', 'STOP!', 'stop. ', 'Unsubscribe\n', 'quit!!'])('%j normalises to a STOP', (t) => {
    expect(classifyWhatsAppKeyword(t)).toBe('stop');
  });
  it.each(['START', 'start', 'Start.', 'UNSTOP', ' unstop '])('%j is a START', (t) => {
    expect(classifyWhatsAppKeyword(t)).toBe('start');
  });
  it.each([
    'please stop messaging me', 'stop it', 'I want to stop', 'do not stop', "don't stop", 'stop, thanks', 'STOP STOP',
    'cancel my order', 'yes', 'YES', 'subscribe', 'hello', '', '   ', 'stopping', 'ENDING',
  ])('%j is NOT a keyword (free phrases never opt out)', (t) => {
    expect(classifyWhatsAppKeyword(t)).toBeNull();
  });
  it('handles null/undefined', () => {
    expect(classifyWhatsAppKeyword(null)).toBeNull();
    expect(classifyWhatsAppKeyword(undefined)).toBeNull();
    expect(normalizeKeyword(undefined)).toBe('');
  });
  it('the STOP set matches the Twilio inbound webhook plus REMOVE', () => {
    expect(WHATSAPP_STOP_KEYWORDS).toEqual(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REMOVE']);
  });
});
