import { describe, it, expect } from 'vitest';
import { mapDeliveryRow, summariseDeliveryLog } from './deliveryLog';

describe('mapDeliveryRow', () => {
  it('flattens the embedded conversation and pulls error fields out of metadata', () => {
    const row = mapDeliveryRow({
      id: 'm1',
      external_id: 'mid.1',
      content: 'hello there this is a fairly long message body that should be truncated for the preview column',
      status: 'failed',
      sent_at: '2026-09-04T10:00:00Z',
      metadata: { error_message: 'Invalid OAuth access token.', error_code: 190, error_type: 'OAuthException', attempts: 3, last_failure_class: 'permanent' },
      conversations: { platform: 'instagram', title: 'Jane Doe', external_thread_id: 'igsid-1' },
    });
    expect(row).toMatchObject({
      id: 'm1',
      platform: 'instagram',
      recipient: 'Jane Doe',
      status: 'failed',
      attempts: 3,
      error_code: 190,
      failure_class: 'permanent',
      is_auth_error: true,
    });
    expect(row.content_preview.length).toBeLessThanOrEqual(80);
  });

  it('handles conversations returned as an array and missing metadata', () => {
    const row = mapDeliveryRow({
      id: 'm2', content: 'hi', status: 'sent', sent_at: 'x', external_id: null, metadata: null,
      conversations: [{ platform: 'whatsapp', title: null, external_thread_id: '+27123' }],
    });
    expect(row.platform).toBe('whatsapp');
    expect(row.recipient).toBe('+27123');
    expect(row.attempts).toBeNull();
    expect(row.is_auth_error).toBe(false);
  });
});

describe('summariseDeliveryLog', () => {
  const mk = (status: string, over: any = {}) => ({
    id: Math.random().toString(), sent_at: 'x', platform: 'instagram', recipient: 'r', status,
    attempts: null, external_id: null, error_message: null, error_code: null, failure_class: null,
    is_auth_error: false, content_preview: '', ...over,
  });

  it('buckets in-flight vs settled vs failed and computes the failure rate', () => {
    const rows = [
      mk('sent'), mk('delivered'), mk('read'),
      mk('sending'), mk('retrying'),
      mk('failed'), mk('failed', { is_auth_error: true }),
    ];
    const s = summariseDeliveryLog(rows as any);
    expect(s.total).toBe(7);
    expect(s.inFlight).toBe(2);
    expect(s.failed).toBe(2);
    expect(s.settled).toBe(3);
    expect(s.authErrors).toBe(1);
    expect(s.failureRate).toBeCloseTo(2 / 7);
  });

  it('empty log → zeroed summary, no divide-by-zero', () => {
    const s = summariseDeliveryLog([]);
    expect(s).toMatchObject({ total: 0, failed: 0, failureRate: 0, authErrors: 0 });
  });
});
