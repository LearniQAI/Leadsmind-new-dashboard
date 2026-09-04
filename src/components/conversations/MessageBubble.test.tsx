import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { MessageBubble } from './MessageBubble';

const base = {
  content: 'hello there',
  direction: 'outbound' as const,
  sentAt: '2026-09-04T12:00:00.000Z',
  isFirstInGroup: true,
  isLastInGroup: true,
};

const html = (props: Partial<Parameters<typeof MessageBubble>[0]>) =>
  renderToStaticMarkup(<MessageBubble {...base} {...(props as any)} />);

const count = (s: string, needle: string) => s.split(needle).length - 1;

describe('MessageBubble — outbound delivery states (Part 3)', () => {
  it('sending: persistent "Sending…" + spinner, lighter bubble, no Retry', () => {
    const s = html({ status: 'sending' });
    expect(s).toContain('Sending');
    expect(s).toContain('lucide-loader'); // spinner
    expect(s).toContain('bg-[#3797F0]/55'); // in-flight tint
    expect(s).not.toContain('>Retry<');
  });

  it('sent: solid bubble, one check, nothing noisy', () => {
    const s = html({ status: 'sent' });
    expect(s).toContain('bg-[#3797F0] !text-white');
    expect(count(s, 'lucide-check')).toBe(1);
    expect(s).not.toContain('Sending');
    expect(s).not.toContain('Retrying');
    expect(s).not.toContain('>Retry<');
  });

  it('delivered: two checks (double tick)', () => {
    expect(count(html({ status: 'delivered' }), 'lucide-check')).toBe(2);
  });

  it('read: two checks (Instagram jumps sent -> read, still a valid double tick)', () => {
    expect(count(html({ status: 'read' }), 'lucide-check')).toBe(2);
  });

  it('retrying: calm "Retrying…" line, NOT red, NOT a Retry button', () => {
    const s = html({ status: 'retrying', metadata: { attempts: 2 } });
    expect(s).toContain('Retrying');
    expect(s).toContain('attempt 2');
    expect(s).not.toContain('border border-red/60'); // not the failed red outline
    expect(s).not.toContain('>Retry<');
  });

  it('failed: red outline, reason visible, one-tap Retry when onRetry given', () => {
    const s = html({ status: 'failed', errorMessage: 'Invalid OAuth access token.', onRetry: vi.fn() });
    expect(s).toContain('border border-red/60');
    expect(s).toContain('Invalid OAuth access token.');
    expect(s).toContain('<button');
    expect(s).toContain('Retry');
    expect(s).toContain('lucide-rotate-ccw');
    // original text is still shown, never hidden
    expect(s).toContain('hello there');
  });

  it('failed without onRetry: reason shown but no Retry button', () => {
    const s = html({ status: 'failed', errorMessage: 'Nope' });
    expect(s).toContain('Nope');
    expect(s).not.toContain('<button');
  });

  it('inbound bubbles never show delivery affordances', () => {
    const s = html({ direction: 'inbound', status: 'delivered' });
    expect(s).not.toContain('Sending');
    expect(s).not.toContain('lucide-check');
  });
});
