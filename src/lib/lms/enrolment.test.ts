import { describe, it, expect } from 'vitest';
import { isEnrolmentActive, enrolmentInactiveReason } from './enrolment';

const past = () => new Date(Date.now() - 60_000).toISOString();
const future = () => new Date(Date.now() + 86_400_000).toISOString();

describe('isEnrolmentActive / enrolmentInactiveReason', () => {
  it('treats a missing row as not enrolled', () => {
    expect(isEnrolmentActive(null)).toBe(false);
    expect(enrolmentInactiveReason(undefined)).toMatch(/not enrolled/i);
  });

  it('active status, no expiry fields -> active', () => {
    expect(isEnrolmentActive({ status: 'active', active: true })).toBe(true);
    expect(isEnrolmentActive({ status: null, active: null })).toBe(true); // legacy row
  });

  it.each(['inactive', 'cancelled', 'canceled', 'expired', 'suspended', 'revoked', 'pending_approval', 'rejected'])(
    'status %s -> inactive with a reason',
    (status) => {
      expect(isEnrolmentActive({ status })).toBe(false);
      expect(enrolmentInactiveReason({ status })).toBeTruthy();
    }
  );

  it('active=false -> inactive', () => {
    expect(isEnrolmentActive({ status: 'active', active: false })).toBe(false);
  });

  it('past expires_at -> inactive (access window closed)', () => {
    expect(isEnrolmentActive({ status: 'active', active: true, expires_at: past() })).toBe(false);
    expect(enrolmentInactiveReason({ status: 'active', expires_at: past() })).toMatch(/expired/i);
  });

  it('future or null expires_at -> still active', () => {
    expect(isEnrolmentActive({ status: 'active', expires_at: future() })).toBe(true);
    expect(isEnrolmentActive({ status: 'active', expires_at: null })).toBe(true);
  });

  it('an unparseable expires_at does not lock the student out', () => {
    expect(isEnrolmentActive({ status: 'active', expires_at: 'not-a-date' })).toBe(true);
  });

  it('grace period: holds until it lapses, then access is gone', () => {
    expect(isEnrolmentActive({ status: 'active', grace_period_expires_at: future() })).toBe(true);
    expect(isEnrolmentActive({ status: 'active', grace_period_expires_at: past() })).toBe(false);
  });

  it('a past expires_at is not rescued by a future grace period', () => {
    expect(isEnrolmentActive({ status: 'active', expires_at: past(), grace_period_expires_at: future() })).toBe(false);
  });

  it('isEnrolmentActive is exactly reason === null', () => {
    const rows = [{ status: 'active' }, { status: 'suspended' }, { status: 'active', expires_at: past() }];
    for (const r of rows) expect(isEnrolmentActive(r)).toBe(enrolmentInactiveReason(r) === null);
  });
});
