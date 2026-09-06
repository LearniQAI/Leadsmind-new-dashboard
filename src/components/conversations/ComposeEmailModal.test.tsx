// @vitest-environment jsdom
//
// Radix's Dialog portals into document.body, which needs a real DOM — the
// project's default vitest environment is 'node' (see vitest.config.ts;
// jsdom is present as a transitive dependency and @testing-library/react is
// already wired in src/test/setup.ts, just not used with this environment
// anywhere else yet). This per-file override is scoped to this test only and
// does not change the global config or any other test's environment.
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

// Render-shape test only — the actual submit flow (and its use of the real,
// server-only `startEmailConversation` action) is covered by
// composeEmail.test.ts. Mocked here purely so importing the component doesn't
// pull in server-only React APIs (`cache`) that error outside a server context.
vi.mock('@/app/actions/composeEmail', () => ({
  startEmailConversation: vi.fn(),
}));

import { ComposeEmailModal } from './ComposeEmailModal';

afterEach(() => cleanup());

describe('ComposeEmailModal — premium redesign + bleed-through fix', () => {
  it('gives the dialog panel an explicit opaque background (the fix for the backdrop bleed-through bug)', () => {
    render(<ComposeEmailModal open={true} onOpenChange={vi.fn()} onStarted={vi.fn()} />);

    // The shared DialogContent's default `bg-background` resolves to a dark,
    // non-opaque theme token in this app (globals.css: --background: var(--n900)),
    // which is exactly what let the blurred page behind show through the panel.
    // Every other real consumer of this shared dialog already overrides it —
    // this asserts ComposeEmailModal does too, so the regression can't come back.
    const panel = screen.getByRole('dialog');
    expect(panel.className).toMatch(/\bbg-white\b/);
    expect(panel.className).not.toMatch(/\bbg-background\b/);
  });

  it('renders the premium header, both fields, and the helper note', () => {
    render(<ComposeEmailModal open={true} onOpenChange={vi.fn()} onStarted={vi.fn()} />);

    expect(screen.getByText('New email')).toBeTruthy();
    expect(screen.getByText(/Start a conversation with anyone/)).toBeTruthy();
    expect(screen.getByPlaceholderText('name@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('Leave blank for a default subject')).toBeTruthy();
    expect(screen.getByText('Start conversation')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows an inline error for an invalid address and never calls onStarted', () => {
    const onStarted = vi.fn();
    render(<ComposeEmailModal open={true} onOpenChange={vi.fn()} onStarted={onStarted} />);

    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByText('Start conversation'));

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(onStarted).not.toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    render(<ComposeEmailModal open={false} onOpenChange={vi.fn()} onStarted={vi.fn()} />);
    expect(screen.queryByText('New email')).toBeNull();
  });
});
