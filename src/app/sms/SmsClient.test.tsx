// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/app/actions/bulk_sms', () => ({
  createBulkSmsCampaign: vi.fn(), cancelBulkSmsCampaign: vi.fn(), deleteBulkSmsCampaign: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SmsClient from './SmsClient';

const segments = [{ id: 's1', name: 'VIPs', reach: { sms: 40 } }];
const campaign = (over: any = {}) => ({
  id: 'c1', name: 'Spring', message_body: 'hello', status: 'completed', scheduled_at: null, sent_at: null,
  total_recipients: 10, total_sent: 9, total_failed: 1, total_skipped_opt_out: 0, total_delivered: 7, total_undelivered: 2, created_at: '2026-09-21', ...over,
});

// The header button and the empty-state action share this label: the header one comes first.
const newCampaignButton = () => screen.getAllByText('New SMS Campaign')[0].closest('button') as HTMLButtonElement;
const openCompose = () => {
  fireEvent.click(newCampaignButton());
  return screen.getByPlaceholderText(/Hi \{\{first_name\}\}/) as HTMLTextAreaElement;
};
const type = (ta: HTMLTextAreaElement, value: string) => fireEvent.change(ta, { target: { value } });

beforeEach(() => cleanup());

describe('E: Twilio not connected', () => {
  it('shows an upfront banner and disables creating a campaign', () => {
    render(<SmsClient initialCampaigns={[]} segments={segments} smsReady={false} />);
    expect(screen.getByText(/Connect your Twilio account and a sending number/)).toBeTruthy();
    expect(newCampaignButton().disabled).toBe(true);
  });
  it('no banner and an enabled button once connected', () => {
    render(<SmsClient initialCampaigns={[]} segments={segments} smsReady />);
    expect(screen.queryByText(/Connect your Twilio account and a sending number/)).toBeNull();
    expect(newCampaignButton().disabled).toBe(false);
  });
});

describe('H: compose box explains length, encoding and cost', () => {
  it('shows character count, segment count and encoding for a plain message', () => {
    render(<SmsClient initialCampaigns={[]} segments={segments} />);
    type(openCompose(), 'Hello there, sale on now');
    expect(screen.getByText(/24\/320 characters/)).toBeTruthy();
    expect(screen.getByText(/1 segment per recipient · GSM-7/)).toBeTruthy();
    expect(screen.queryByText(/force Unicode/)).toBeNull();
  });

  it('warns when an emoji forces Unicode, naming the character and the 70-character limit', () => {
    render(<SmsClient initialCampaigns={[]} segments={segments} />);
    type(openCompose(), 'Sale today 🎉');
    expect(screen.getByText(/1 segment per recipient · Unicode/)).toBeTruthy();
    const warning = screen.getByText(/force Unicode/);
    expect(warning.textContent).toContain('🎉');
    expect(warning.textContent).toContain('only 70 characters fit per segment');
  });

  it('counts a long message in segments, not just characters', () => {
    render(<SmsClient initialCampaigns={[]} segments={segments} />);
    type(openCompose(), 'a'.repeat(200));
    expect(screen.getByText(/200\/320 characters/)).toBeTruthy();
    expect(screen.getByText(/2 segments per recipient/)).toBeTruthy();
  });

  it('reminds about STOP wording and offers to add it; the reminder goes away once present', () => {
    render(<SmsClient initialCampaigns={[]} segments={segments} />);
    const ta = openCompose();
    type(ta, 'Big sale this weekend');
    expect(screen.getByText(/should tell people how to opt out/)).toBeTruthy();
    fireEvent.click(screen.getByText('Add opt-out wording'));
    expect(ta.value).toBe('Big sale this weekend Reply STOP to opt out.');
    expect(screen.queryByText(/should tell people how to opt out/)).toBeNull();
  });

  it('never truncates silently: an over-length message is kept, flagged, and cannot be scheduled', () => {
    render(<SmsClient initialCampaigns={[]} segments={segments} />);
    const ta = openCompose();
    type(ta, 'x'.repeat(350));
    expect(ta.value.length).toBe(350); // used to be silently sliced to 320
    expect(screen.getByText(/350\/320 characters — too long/)).toBeTruthy();
    expect((screen.getByText('Schedule campaign').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('mentions merge tags', () => {
    render(<SmsClient initialCampaigns={[]} segments={segments} />);
    openCompose();
    expect(screen.getByText(/Merge tags such as/)).toBeTruthy();
  });
});

describe('G: delivery receipts on the campaign card', () => {
  it('distinguishes accepted ("sent") from delivered, not delivered and failed', () => {
    render(<SmsClient initialCampaigns={[campaign()] as any} segments={segments} />);
    expect(screen.getByText('9 sent')).toBeTruthy();
    expect(screen.getByText('7 delivered')).toBeTruthy();
    expect(screen.getByText('2 not delivered')).toBeTruthy();
    expect(screen.getByText('1 failed')).toBeTruthy();
  });

  it('shows the campaign status pill (sending / failed)', () => {
    render(<SmsClient initialCampaigns={[campaign({ status: 'sending' }), campaign({ id: 'c2', name: 'Other', status: 'failed' })] as any} segments={segments} />);
    expect(screen.getByText('sending')).toBeTruthy();
    expect(screen.getByText('failed')).toBeTruthy();
  });
});
