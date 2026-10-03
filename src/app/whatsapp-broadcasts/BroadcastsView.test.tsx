// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  create: vi.fn(),
  preview: vi.fn(),
  options: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { error: h.toastError, success: vi.fn() } }));
vi.mock('@/app/actions/whatsapp_broadcast', () => ({
  createWhatsAppBroadcastCampaign: h.create,
  cancelWhatsAppBroadcastCampaign: vi.fn(),
  deleteWhatsAppBroadcastCampaign: vi.fn(),
  listApprovedWhatsAppTemplates: vi.fn(async () => ({ success: true, data: [], mock: false })),
  previewWhatsAppBroadcastAudience: h.preview,
  listAudienceSegmentOptions: h.options,
}));

import BroadcastsView from './BroadcastsView';
import { buildAudienceInput, EMPTY_AUDIENCE, describeExclusions } from './AudiencePicker';

beforeEach(() => {
  h.create.mockReset(); h.preview.mockReset(); h.options.mockReset(); h.toastError.mockReset();
  h.options.mockResolvedValue({ success: true, data: [] });
});

describe('BroadcastsView with 0 saved segments', () => {
  it('has no Segment requirement: button enabled, no notice, empty-state action works', async () => {
    render(<BroadcastsView campaigns={[]} setCampaigns={() => {}} />);
    expect(document.body.textContent).not.toMatch(/at least one Segment/i);
    const buttons = screen.getAllByRole('button', { name: /New WhatsApp Campaign/i });
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) expect((b as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(screen.getByText(/agreed to receive WhatsApp marketing messages from my business/)).toBeTruthy());
    expect(document.body.textContent).toMatch(/All contacts \(not opted out\)|Audience/);
    expect(document.body.textContent).toMatch(/does not yet record WhatsApp consent/);
    expect(screen.getByRole('button', { name: /Preview audience/i })).toBeTruthy();
  });

  it('does not create without the attestation, and never calls the server', async () => {
    render(<BroadcastsView campaigns={[]} setCampaigns={() => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: /New WhatsApp Campaign/i })[0]);
    await waitFor(() => screen.getByPlaceholderText(/Spring Sale Blast/));
    fireEvent.change(screen.getByPlaceholderText(/Spring Sale Blast/), { target: { value: 'Blast' } });
    fireEvent.change(screen.getByPlaceholderText(/Hi \{\{contact.first_name\}\}/), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: /Schedule campaign/i }));
    expect(h.create).not.toHaveBeenCalled();
    expect(h.toastError).toHaveBeenCalledWith(expect.stringMatching(/agreed to receive WhatsApp marketing/));
  });

  it('submits an audience object and consentAttested:true once attested', async () => {
    h.create.mockResolvedValue({ success: true, data: { id: 'c1', name: 'Blast', status: 'scheduled', total_recipients: 1, total_sent: 0, total_failed: 0, total_skipped_opt_out: 0, total_skipped_no_template: 0, created_at: '', scheduled_at: null, message_body: 'hello', template_name: null, template_language: null }, recipientCount: 1, excludedOptOut: 0 });
    render(<BroadcastsView campaigns={[]} setCampaigns={() => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: /New WhatsApp Campaign/i })[0]);
    await waitFor(() => screen.getByPlaceholderText(/Spring Sale Blast/));
    fireEvent.change(screen.getByPlaceholderText(/Spring Sale Blast/), { target: { value: 'Blast' } });
    fireEvent.change(screen.getByPlaceholderText(/Hi \{\{contact.first_name\}\}/), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /agreed to receive WhatsApp marketing/i }));
    fireEvent.click(screen.getByRole('button', { name: /Schedule campaign/i }));
    await waitFor(() => expect(h.create).toHaveBeenCalledTimes(1));
    expect(h.create.mock.calls[0][0]).toMatchObject({ name: 'Blast', audience: { type: 'all_contacts' }, consentAttested: true });
    expect(h.create.mock.calls[0][0].segmentId).toBeUndefined();
  });

  it('only offers "Saved segment" when options exist', async () => {
    h.options.mockResolvedValue({ success: true, data: [] });
    render(<BroadcastsView campaigns={[]} setCampaigns={() => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: /New WhatsApp Campaign/i })[0]);
    await waitFor(() => expect(h.options).toHaveBeenCalledTimes(1));
    expect(document.body.textContent).not.toMatch(/Saved segment/);
  });
});

describe('audience form helpers', () => {
  it('validates each type', () => {
    expect(buildAudienceInput(EMPTY_AUDIENCE)).toEqual({ ok: true, audience: { type: 'all_contacts' } });
    expect(buildAudienceInput({ ...EMPTY_AUDIENCE, type: 'tags' })).toMatchObject({ ok: false });
    expect(buildAudienceInput({ ...EMPTY_AUDIENCE, type: 'tags', tags: ' vip, news ,', tagMode: 'any' })).toEqual({ ok: true, audience: { type: 'tags', tags: ['vip', 'news'], mode: 'any' } });
    expect(buildAudienceInput({ ...EMPTY_AUDIENCE, type: 'contact_fields' })).toMatchObject({ ok: false });
    expect(buildAudienceInput({ ...EMPTY_AUDIENCE, type: 'contact_fields', hasPhone: true, source: 'web' })).toMatchObject({ ok: true, audience: { type: 'contact_fields', filters: [{ field: 'has_phone', value: true }, { field: 'source', value: 'web' }] } });
    expect(buildAudienceInput({ ...EMPTY_AUDIENCE, type: 'saved_segment' })).toMatchObject({ ok: false });
    expect(buildAudienceInput({ ...EMPTY_AUDIENCE, type: 'saved_segment', segmentId: 's1' })).toEqual({ ok: true, audience: { type: 'saved_segment', segmentId: 's1' } });
  });

  it('describes exclusions in plain language, skipping zeros', () => {
    const lines = describeExclusions({ no_phone: 1, invalid_number: 0, opted_out: 3, suppressed: 0, duplicate_phone: 2 });
    expect(lines).toEqual(['3 contacts opted out', '1 contact with no phone number', '2 contacts sharing a number already in the audience']);
  });
});
