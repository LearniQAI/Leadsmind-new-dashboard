// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({ duplicateSegment: vi.fn() }));
vi.mock('@/app/actions/segments', () => ({
  createSegment: vi.fn(), updateSegment: vi.fn(), deleteSegment: vi.fn(), getSegmentDependents: vi.fn(),
  duplicateSegment: h.duplicateSegment,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/crm/SegmentRuleBuilder', () => ({ SegmentRuleBuilder: () => null }));

import SegmentsClient from './SegmentsClient';

const rule_group = { logic: 'AND', rules: [{ field: 'first_name', operator: 'equals', value: 'x' }] };
const seg = (over: any) => ({ id: 's1', name: 'VIP', memberCount: 10, created_at: '2026-09-21', rule_group, ...over });

beforeEach(() => { cleanup(); h.duplicateSegment.mockReset(); });

describe('SegmentsClient counts + duplicate', () => {
  it('labels the raw count as matching and shows the reachable breakdown separately', () => {
    render(<SegmentsClient initialSegments={[seg({ reach: { email: 7, sms: 4, whatsapp: 4 } })] as any} />);
    expect(screen.getByText('10 matching contacts')).toBeTruthy();
    expect(screen.getByTestId('segment-reach').textContent).toBe('Reachable: 7 email · 4 SMS · 4 WhatsApp');
  });

  it('shows "Count unavailable" only when the count truly failed, and no reach line', () => {
    render(<SegmentsClient initialSegments={[seg({ memberCount: null, reach: null })] as any} />);
    expect(screen.getByText('Count unavailable')).toBeTruthy();
    expect(screen.queryByTestId('segment-reach')).toBeNull();
  });

  it('Duplicate adds the returned copy to the list immediately, with its own counts', async () => {
    h.duplicateSegment.mockResolvedValue({ success: true, data: seg({ id: 's2', name: 'VIP (Copy)', memberCount: 10, reach: { email: 7, sms: 4, whatsapp: 4 } }) });
    render(<SegmentsClient initialSegments={[seg({ reach: { email: 7, sms: 4, whatsapp: 4 } })] as any} />);
    const trigger = screen.getByText('VIP').closest('div')!.parentElement!.querySelector('button')!;
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(await screen.findByText('Duplicate'));
    await waitFor(() => expect(h.duplicateSegment).toHaveBeenCalledWith('s1'));
    expect(await screen.findByText('VIP (Copy)')).toBeTruthy();
    expect(screen.getAllByText('10 matching contacts').length).toBe(2);
  });
});
