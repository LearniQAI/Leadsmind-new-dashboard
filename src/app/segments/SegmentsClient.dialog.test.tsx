// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({
  deps: [] as any[],
  getSegmentDependents: vi.fn(),
  deleteSegment: vi.fn(),
}));
vi.mock('@/app/actions/segments', () => ({
  createSegment: vi.fn(),
  updateSegment: vi.fn(),
  getSegmentDependents: h.getSegmentDependents,
  deleteSegment: h.deleteSegment,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/crm/SegmentRuleBuilder', () => ({ SegmentRuleBuilder: () => null }));

import SegmentsClient from './SegmentsClient';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

const seg = (id: string, name: string) => ({
  id, name, memberCount: 3, created_at: '2026-09-21', rule_group: { logic: 'AND', rules: [{ field: 'first_name', operator: 'equals', value: 'x' }] },
});

async function openDeleteFor(name: string) {
  // Radix DropdownMenu opens on pointerdown of the trigger.
  const card = screen.getByText(name).closest('div')!.parentElement!;
  const trigger = card.querySelector('button')!;
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
  fireEvent.click(await screen.findByText('Delete'));
}

beforeEach(() => {
  cleanup();
  h.getSegmentDependents.mockReset();
  h.deleteSegment.mockReset();
});

describe('SegmentsClient delete dialog', () => {
  it('renders each dependent by name with its kind and status, and an explicit "Delete anyway"', async () => {
    h.getSegmentDependents.mockResolvedValue({
      success: true,
      data: [
        { kind: 'email_campaign', id: '1', name: 'Spring push', status: 'scheduled' },
        { kind: 'auto_sender', id: '2', name: 'Welcome drip', status: 'sent' },
        { kind: 'sms_campaign', id: '3', name: 'SMS promo', status: 'draft' },
      ],
    });
    h.deleteSegment.mockResolvedValue({ success: true });
    render(<SegmentsClient initialSegments={[seg('s1', 'VIP list')] as any} />);
    await openDeleteFor('VIP list');

    const box = await screen.findByTestId('segment-dependents');
    expect(box.textContent).toContain('"VIP list" is still used by 3 items');
    const items = Array.from(box.querySelectorAll('li')).map((li) => li.textContent);
    expect(items).toEqual([
      'Spring push — Email campaign, scheduled',
      'Welcome drip — Auto-sender, sent',
      'SMS promo — SMS broadcast, draft',
    ]);
    expect(h.deleteSegment).not.toHaveBeenCalled(); // warning shown BEFORE anything is deleted

    fireEvent.click(screen.getByRole('button', { name: 'Delete anyway' }));
    await waitFor(() => expect(h.deleteSegment).toHaveBeenCalledWith('s1', { acknowledgeDependents: true }));
  });

  it('an unreferenced segment shows the plain confirmation, no dependents list', async () => {
    h.getSegmentDependents.mockResolvedValue({ success: true, data: [] });
    h.deleteSegment.mockResolvedValue({ success: true });
    render(<SegmentsClient initialSegments={[seg('s2', 'Empty one')] as any} />);
    await openDeleteFor('Empty one');

    await screen.findByText('Are you sure you want to delete "Empty one"?');
    expect(screen.queryByTestId('segment-dependents')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(h.deleteSegment).toHaveBeenCalledWith('s2', { acknowledgeDependents: false }));
  });
});

describe('ConfirmDialog plain-text description (all other callers)', () => {
  it('still renders a string description as the dialog description text, unchanged', () => {
    render(
      <ConfirmDialog isOpen onClose={() => {}} onConfirm={() => {}} title="Delete funnel?"
        description={'This will permanently delete "F1". This action is irreversible.'} confirmLabel="Delete" />
    );
    const desc = screen.getByText('This will permanently delete "F1". This action is irreversible.');
    expect(desc.className).toContain('text-[13.5px]');
    expect(desc.className).toContain('max-w-[320px]');
    // Radix still wires it up as the accessible description of the dialog.
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-describedby')).toBe(desc.id);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });
});
