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
import { buildAudienceInput, EMPTY_AUDIENCE, describeExclusions, evaluateWindowGate } from './AudiencePicker';

const prev = (open: number, closed: number) => ({ success: true, counts: { matched: open + closed, eligible: open + closed }, exclusions: { no_phone: 0, invalid_number: 0, opted_out: 0, suppressed: 0, duplicate_phone: 0 }, sample: [{ name: 'Ann', phone: '***123' }], window: { open, closed } });
async function openFormAndPreview(open: number, closed: number) {
  h.preview.mockResolvedValue(prev(open, closed));
  render(<BroadcastsView campaigns={[]} setCampaigns={() => {}} />);
  fireEvent.click(screen.getAllByRole('button', { name: /New WhatsApp Campaign/i })[0]);
  await waitFor(() => screen.getByPlaceholderText(/Spring Sale Blast/));
  fireEvent.change(screen.getByPlaceholderText(/Spring Sale Blast/), { target: { value: 'Blast' } });
  fireEvent.change(screen.getByPlaceholderText(/Hi \{\{contact.first_name\}\}/), { target: { value: 'hello' } });
  fireEvent.click(screen.getByRole('button', { name: /Preview audience/i }));
  await waitFor(() => expect(h.preview).toHaveBeenCalledTimes(1));
  await waitFor(() => screen.getByText(/can receive this campaign/));
}
const createBtn = () => screen.getByRole('button', { name: /Schedule campaign/i }) as HTMLButtonElement;

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
    await openFormAndPreview(2, 0);
    expect(createBtn().disabled).toBe(false);
    fireEvent.click(createBtn());
    expect(h.create).not.toHaveBeenCalled();
    expect(h.toastError).toHaveBeenCalledWith(expect.stringMatching(/agreed to receive WhatsApp marketing/));
  });

  it('submits an audience object and consentAttested:true once attested', async () => {
    h.create.mockResolvedValue({ success: true, data: { id: 'c1', name: 'Blast', status: 'scheduled', total_recipients: 1, total_sent: 0, total_failed: 0, total_skipped_opt_out: 0, total_skipped_no_template: 0, created_at: '', scheduled_at: null, message_body: 'hello', template_name: null, template_language: null }, recipientCount: 1, excludedOptOut: 0 });
    await openFormAndPreview(2, 0);
    fireEvent.click(screen.getByRole('checkbox', { name: /agreed to receive WhatsApp marketing/i }));
    fireEvent.click(createBtn());
    await waitFor(() => expect(h.create).toHaveBeenCalledTimes(1));
    expect(h.create.mock.calls[0][0]).toMatchObject({ name: 'Blast', audience: { type: 'all_contacts' }, consentAttested: true });
    expect(h.create.mock.calls[0][0].segmentId).toBeUndefined();
  });

  it('24h window, state 1: everyone in-window -> no warning, Create enabled, counts shown', async () => {
    await openFormAndPreview(3, 0);
    expect(screen.queryByTestId('window-warning')).toBeNull();
    expect(createBtn().disabled).toBe(false);
    expect(document.body.textContent).toMatch(/3 have an open 24-hour window/);
    expect(document.body.textContent).toMatch(/0 do not/);
  });

  it('24h window, state 2: some outside the window and no template -> amber warning, Create disabled and inert', async () => {
    await openFormAndPreview(1, 4);
    const w = screen.getByTestId('window-warning');
    expect(w.textContent).toMatch(/4 recipients have no open 24-hour window and would be skipped without an approved template/);
    expect(w.className).toMatch(/amber/);
    expect(createBtn().disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: /agreed to receive WhatsApp marketing/i }));
    fireEvent.click(createBtn());
    expect(h.create).not.toHaveBeenCalled();
  });

  it('singular wording for exactly one recipient outside the window', async () => {
    await openFormAndPreview(2, 1);
    expect(screen.getByTestId('window-warning').textContent).toMatch(/^1 recipient has no open 24-hour window/);
  });

  it('before any preview, Create is disabled with a hint to preview (no template)', async () => {
    render(<BroadcastsView campaigns={[]} setCampaigns={() => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: /New WhatsApp Campaign/i })[0]);
    await waitFor(() => screen.getByTestId('window-needs-preview'));
    expect(createBtn().disabled).toBe(true);
  });

  it('only offers "Saved segment" when options exist', async () => {
    h.options.mockResolvedValue({ success: true, data: [] });
    render(<BroadcastsView campaigns={[]} setCampaigns={() => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: /New WhatsApp Campaign/i })[0]);
    await waitFor(() => expect(h.options).toHaveBeenCalledTimes(1));
    expect(document.body.textContent).not.toMatch(/Saved segment/);
  });
});

describe('evaluateWindowGate', () => {
  it('a chosen template unblocks Create whatever the window counts say', () => {
    expect(evaluateWindowGate(true, { open: 0, closed: 9 })).toEqual({ closed: 0, needsPreview: false, blocked: false });
    expect(evaluateWindowGate(true, null)).toEqual({ closed: 0, needsPreview: false, blocked: false });
  });
  it('no template: blocked until previewed, then only while someone is outside the window', () => {
    expect(evaluateWindowGate(false, null)).toEqual({ closed: 0, needsPreview: true, blocked: true });
    expect(evaluateWindowGate(false, { open: 5, closed: 0 }).blocked).toBe(false);
    expect(evaluateWindowGate(false, { open: 5, closed: 2 })).toEqual({ closed: 2, needsPreview: false, blocked: true });
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
