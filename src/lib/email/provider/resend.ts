import { Resend } from 'resend';
import { verifyResendWebhookEvent } from '@/lib/email/verifyResendWebhook';
import {
  EmailProviderError,
  type DeliveryStatus,
  type DomainDnsRecord,
  type DomainStatus,
  type EmailSendingProvider,
  type NormalizedEmailEvent,
  type OutboundEmail,
  type ProviderDomain,
} from './types';

const EVENT_TYPES: Record<string, NormalizedEmailEvent['type']> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.bounced': 'bounce',
  'email.complained': 'complaint',
  'email.opened': 'open',
  'email.clicked': 'click',
  'email.failed': 'failed',
  'email.suppressed': 'suppressed',
};

const DOMAIN_STATUSES = new Set<DomainStatus>([
  'not_started', 'pending', 'verified', 'failed', 'temporary_failure', 'partially_verified', 'partially_failed',
]);

function toDomain(d: { id: string; name: string; status: string; region?: string | null; records?: any[] }): ProviderDomain {
  return {
    id: d.id,
    name: d.name,
    status: (DOMAIN_STATUSES.has(d.status as DomainStatus) ? d.status : 'pending') as DomainStatus,
    region: d.region ?? null,
    records: (d.records ?? []).map((r): DomainDnsRecord => ({
      purpose: r.record === 'SPF' ? 'SPF' : r.record === 'DKIM' ? 'DKIM' : 'OTHER',
      type: r.type,
      name: r.name,
      value: r.value,
      priority: r.priority ?? undefined,
      ttl: r.ttl ?? undefined,
      status: r.status,
    })),
  };
}

function fail(error: { message?: string; name?: string; statusCode?: number | null } | null | undefined, fallback: string): never {
  throw new EmailProviderError(error?.message || fallback, error?.name ?? null, error?.statusCode ?? null);
}

/**
 * Resend 'Permanent' = hard; 'Transient' / 'Undetermined' = soft. Older flat spellings are kept
 * for events replayed from before Resend nested the type under data.bounce.
 */
export function resendBounceType(data: any): 'hard' | 'soft' {
  const t = String(data?.bounce?.type ?? data?.bounceType ?? data?.type ?? '').toLowerCase();
  return t.includes('permanent') || t === 'hard' ? 'hard' : 'soft';
}

export class ResendProvider implements EmailSendingProvider {
  readonly name = 'resend';
  private readonly client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(email: OutboundEmail): Promise<{ id: string }> {
    const { data, error } = await this.client.emails.send(
      {
        from: email.from,
        to: email.to,
        subject: email.subject,
        react: email.react as any,
        html: email.html || undefined,
        text: email.text || '',
        replyTo: email.replyTo || undefined,
        tags: email.tags,
        headers: email.headers,
        attachments: email.attachments,
        scheduledAt: email.scheduledAt || undefined,
      } as any,
      email.idempotencyKey ? { idempotencyKey: email.idempotencyKey } : undefined,
    );
    if (error || !data) fail(error, 'Failed to send email via Resend');
    return { id: data.id };
  }

  async createDomain(name: string): Promise<ProviderDomain> {
    const { data, error } = await this.client.domains.create({ name });
    if (error || !data) fail(error, 'Resend could not create the domain');
    return toDomain(data);
  }

  async verifyDomain(domainId: string): Promise<ProviderDomain> {
    const { error } = await this.client.domains.verify(domainId);
    if (error) fail(error, 'Resend could not start domain verification');
    return this.getDomain(domainId);
  }

  async getDomain(domainId: string): Promise<ProviderDomain> {
    const { data, error } = await this.client.domains.get(domainId);
    if (error || !data) fail(error, 'Resend could not read the domain');
    return toDomain(data);
  }

  async deleteDomain(domainId: string): Promise<void> {
    const { error } = await this.client.domains.remove(domainId);
    // Already gone at the provider = the goal state.
    if (error && error.name !== 'not_found') fail(error, 'Resend could not remove the domain');
  }

  async getDeliveryStatus(messageId: string): Promise<{ status: DeliveryStatus; raw: unknown }> {
    const { data, error } = await this.client.emails.get(messageId);
    if (error || !data) fail(error, 'Resend could not read the email');
    return { status: data.last_event as DeliveryStatus, raw: data };
  }

  parseWebhook(rawBody: string, headers: Record<string, string>, secret: string): NormalizedEmailEvent {
    const body = verifyResendWebhookEvent(
      rawBody,
      {
        'svix-id': headers['svix-id'] ?? '',
        'svix-timestamp': headers['svix-timestamp'] ?? '',
        'svix-signature': headers['svix-signature'] ?? '',
      },
      secret,
    );
    return normalizeResendEvent(body, headers['svix-id'] || null);
  }
}

/** Pure normaliser (exported for tests and for replaying stored payloads). */
export function normalizeResendEvent(body: any, eventId: string | null): NormalizedEmailEvent {
  const type: string = body?.type ?? '';
  const data = body?.data ?? {};
  const isDomainEvent = type.startsWith('domain.');
  const rawTags = data.tags;
  const tags: Record<string, string> = Array.isArray(rawTags)
    ? Object.fromEntries(rawTags.filter((t: any) => t?.name).map((t: any) => [t.name, String(t.value)]))
    : rawTags && typeof rawTags === 'object'
      ? Object.fromEntries(Object.entries(rawTags).map(([k, v]) => [k, String(v)]))
      : {};
  const mapped = EVENT_TYPES[type] ?? null;
  return {
    provider: 'resend',
    eventId,
    type: mapped,
    messageId: isDomainEvent ? null : (data.email_id ?? null),
    recipient: Array.isArray(data.to) ? (data.to[0] ?? null) : (data.to ?? null),
    from: data.from ?? null,
    tags,
    bounceType: mapped === 'bounce' ? resendBounceType(data) : null,
    suppression: mapped === 'suppressed'
      ? { type: data.suppressed?.type ?? null, message: data.suppressed?.message ?? null }
      : null,
    linkUrl: data.click?.link ?? data.click?.url ?? null,
    userAgent: data.click?.userAgent ?? data.open?.user_agent ?? data.open?.userAgent ?? null,
    ipAddress: data.click?.ipAddress ?? data.open?.ip_address ?? data.open?.ipAddress ?? null,
    occurredAt: body?.created_at ?? null,
    domain: isDomainEvent && data.id
      ? { id: data.id, status: DOMAIN_STATUSES.has(data.status) ? data.status : null }
      : null,
    raw: body,
  };
}
