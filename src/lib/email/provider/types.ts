/**
 * Provider-agnostic email sending interface. Everything above this layer (sendEmail, sending
 * domains, the deliverability webhook) talks to an EmailSendingProvider, never to a vendor SDK,
 * so a second provider only needs a new implementation of this file's interface.
 *
 * Suppression is deliberately NOT a provider method: LeadsMind's suppression list is
 * workspace-scoped (global_suppression_list), whereas a provider-level suppression on the shared
 * platform account would block that address for every workspace. See lib/email/suppression.ts.
 */

export type DomainStatus =
  | 'not_started'
  | 'pending'
  | 'verified'
  | 'failed'
  | 'temporary_failure'
  | 'partially_verified'
  | 'partially_failed';

/** One DNS record exactly as the provider requires it. */
export interface DomainDnsRecord {
  /** What the record proves: sender policy, signing key, or something else the provider needs. */
  purpose: 'SPF' | 'DKIM' | 'OTHER';
  type: string;
  /** Host relative to the DNS zone, as the provider tells users to enter it. */
  name: string;
  value: string;
  priority?: number;
  ttl?: string;
  status: string;
}

export interface ProviderDomain {
  id: string;
  name: string;
  status: DomainStatus;
  region?: string | null;
  records: DomainDnsRecord[];
}

export interface OutboundEmail {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: unknown;
  replyTo?: string | string[];
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
  attachments?: { filename: string; content: string }[];
  scheduledAt?: string;
  idempotencyKey?: string;
}

export type DeliveryStatus =
  | 'queued'
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'delivery_delayed'
  | 'bounced'
  | 'complained'
  | 'opened'
  | 'clicked'
  | 'failed'
  | 'suppressed'
  | 'canceled';

/** A provider webhook event, normalised. `type` null = an event this system does not track. */
export interface NormalizedEmailEvent {
  provider: string;
  /** Provider's delivery id (svix-id for Resend); the dedupe key. */
  eventId: string | null;
  type: 'sent' | 'delivered' | 'delivery_delayed' | 'bounce' | 'complaint' | 'open' | 'click' | 'failed' | 'suppressed' | null;
  messageId: string | null;
  recipient: string | null;
  from: string | null;
  tags: Record<string, string>;
  bounceType: 'hard' | 'soft' | null;
  /** Set for 'suppressed': the provider refused the send because of its own account-level list. */
  suppression: { type: string | null; message: string | null } | null;
  linkUrl: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  occurredAt: string | null;
  /** Set for domain lifecycle events (domain.updated etc.). */
  domain: { id: string; status: DomainStatus | null } | null;
  raw: unknown;
}

export class EmailProviderError extends Error {
  constructor(message: string, readonly code: string | null, readonly statusCode: number | null) {
    super(message);
    this.name = 'EmailProviderError';
  }
}

export interface EmailSendingProvider {
  readonly name: string;
  send(email: OutboundEmail): Promise<{ id: string }>;
  createDomain(name: string): Promise<ProviderDomain>;
  /** Asks the provider to re-check DNS now and returns its current view of the domain. */
  verifyDomain(domainId: string): Promise<ProviderDomain>;
  getDomain(domainId: string): Promise<ProviderDomain>;
  deleteDomain(domainId: string): Promise<void>;
  getDeliveryStatus(messageId: string): Promise<{ status: DeliveryStatus; raw: unknown }>;
  /** Verifies the signature (throws on failure) and normalises the event. */
  parseWebhook(rawBody: string, headers: Record<string, string>, secret: string): NormalizedEmailEvent;
}
