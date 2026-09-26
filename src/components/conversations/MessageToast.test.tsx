// @vitest-environment jsdom
// Renders the real sonner <Toaster/> with the real showMessageToast() (the path the header bell's
// Realtime handler calls) — structure, channel label/icon, deep link, burst collapse, on-screen quiet.
import React from 'react';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Toaster, toast } from 'sonner';

vi.mock('@/app/actions/conversationReads', () => ({ getUnreadCounts: vi.fn(async () => ({ total: 0, byConversation: {} })) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

import { showMessageToast, safeInternalLink, resetMessageToastState, type MessageNotification } from './MessageToast';
import { setActiveConversationIds } from '@/lib/conversations/unreadStore';

const note = (over: Partial<MessageNotification> & { platform?: string; conv?: string } = {}): MessageNotification => ({
  id: over.id || Math.random().toString(36).slice(2),
  title: over.title ?? 'Pat Customer',
  message: over.message ?? 'Is the quote still valid?',
  link: over.link ?? `/conversations?c=${over.conv || 'c1'}`,
  metadata: { conversation_id: over.conv || 'c1', platform: over.platform || 'whatsapp', contact_name: over.title ?? 'Pat Customer', subject: null, has_audio: false, ...(over.metadata || {}) },
});

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });

beforeEach(() => {
  render(<Toaster visibleToasts={5} />);
  setActiveConversationIds([]);
  resetMessageToastState();
});
afterEach(async () => {
  act(() => { toast.dismiss(); });
  await flush();
  cleanup();
});

describe('showMessageToast', () => {
  it('renders name, preview and the right channel for every Communications channel', async () => {
    const channels: [string, string][] = [['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['facebook', 'Messenger'], ['sms', 'SMS'], ['email', 'Email']];
    act(() => {
      for (const [platform] of channels) {
        resetMessageToastState(); // one toast per channel here, not a burst
        showMessageToast(note({ platform, conv: `c-${platform}`, message: `hello via ${platform}` }), vi.fn());
      }
    });
    await flush();
    for (const [platform, label] of channels) {
      const card = screen.getByText(`hello via ${platform}`).closest('[role="button"]') as HTMLElement;
      expect(card.getAttribute('aria-label')).toBe(`New ${label} message from Pat Customer. Open conversation.`);
      expect(card.textContent).toContain(label);
      expect(card.textContent).toContain('Open conversation');
    }
  });

  it('shows the email subject for email', async () => {
    act(() => { showMessageToast(note({ platform: 'email', metadata: { subject: 'Quote for March' } as any }), vi.fn()); });
    await flush();
    expect(screen.getByText('Quote for March')).toBeTruthy();
  });

  it('clicking opens the conversation (deep link) and dismissing does not navigate', async () => {
    const navigate = vi.fn();
    act(() => { showMessageToast(note({ conv: 'abc' }), navigate); });
    await flush();
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(navigate).not.toHaveBeenCalled();

    act(() => { showMessageToast(note({ conv: 'abc2', message: 'the second one' }), navigate); });
    await flush();
    fireEvent.click(screen.getByText('the second one').closest('[role="button"]') as HTMLElement);
    expect(navigate).toHaveBeenCalledWith('/conversations?c=abc2');
  });

  it('a second message in the same conversation replaces the first toast (no stacking)', async () => {
    act(() => {
      showMessageToast(note({ conv: 'same', message: 'first' }), vi.fn());
      showMessageToast(note({ conv: 'same', message: 'second' }), vi.fn());
    });
    await flush();
    expect(screen.getAllByRole('button', { name: /Open conversation/ })).toHaveLength(1);
    expect(screen.getByText('second')).toBeTruthy();
  });

  it('a burst collapses into one summary toast', async () => {
    act(() => {
      for (let i = 0; i < 5; i++) showMessageToast(note({ conv: `burst-${i}` }), vi.fn());
    });
    await flush();
    expect(screen.getByText(/new messages/)).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /Open conversation\.$/ }).length).toBeLessThanOrEqual(3);
  });

  it('stays quiet for the thread already open on screen', async () => {
    window.history.pushState({}, '', '/conversations');
    setActiveConversationIds(['open-one']);
    act(() => { showMessageToast(note({ conv: 'open-one' }), vi.fn()); });
    await flush();
    expect(screen.queryByRole('button', { name: /Open conversation/ })).toBeNull();
    window.history.pushState({}, '', '/');
  });
});

describe('safeInternalLink', () => {
  it('only allows same-app paths', () => {
    expect(safeInternalLink('/conversations?c=1')).toBe('/conversations?c=1');
    expect(safeInternalLink('https://evil.example')).toBe('/conversations');
    expect(safeInternalLink('//evil.example')).toBe('/conversations');
    expect(safeInternalLink('/\\evil.example')).toBe('/conversations');
    expect(safeInternalLink(null)).toBe('/conversations');
  });
});
