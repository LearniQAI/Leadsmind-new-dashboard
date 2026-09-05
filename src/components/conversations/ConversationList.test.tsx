import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { ConversationList } from './ConversationList';

const baseProps = {
  conversations: [] as any[],
  activeId: null,
  onSelect: vi.fn(),
  filter: 'all',
  onFilterChange: vi.fn(),
  searchQuery: '',
  onSearchChange: vi.fn(),
  assigneeFilter: 'all',
  onAssigneeFilterChange: vi.fn(),
  activeChannels: ['instagram', 'facebook', 'whatsapp', 'email', 'sms'],
};

const html = (overrides: Partial<typeof baseProps & { channelStatus: any; onComposeEmail: any; onConnectChannel: any }>) =>
  renderToStaticMarkup(<ConversationList {...(baseProps as any)} {...(overrides as any)} />);

describe('ConversationList — always-visible channel tabs + channel-aware empty states', () => {
  it('always renders every channel tab, including ones with zero connection/history', () => {
    const s = html({});
    expect(s).toContain('>Instagram<');
    expect(s).toContain('>Messenger<');
    expect(s).toContain('>WhatsApp<');
    expect(s).toContain('>Email<');
    expect(s).toContain('>SMS<');
  });

  it('email empty state shows the Compose prompt, not a connect prompt', () => {
    const s = html({ filter: 'email', onComposeEmail: vi.fn() });
    expect(s).toContain('No email conversations yet');
    expect(s).toContain('New email');
    expect(s).not.toContain('connected yet');
  });

  it('a disconnected OAuth channel shows a real Connect prompt', () => {
    const s = html({ filter: 'instagram', channelStatus: { instagram: 'disconnected' }, onConnectChannel: vi.fn() });
    expect(s).toContain("Instagram isn&#x27;t connected yet");
    expect(s).toContain('Connect Instagram');
  });

  it('a CONNECTED OAuth channel with zero conversations shows a plain empty state, not a connect prompt', () => {
    const s = html({ filter: 'instagram', channelStatus: { instagram: 'connected' } });
    expect(s).not.toContain('Connect Instagram');
    expect(s).toContain('No conversations yet');
  });

  it('SMS not configured links to Settings instead of an OAuth connect action', () => {
    const s = html({ filter: 'sms', channelStatus: { sms: 'disconnected' } });
    expect(s).toContain("SMS isn&#x27;t configured yet");
    expect(s).toContain('/settings');
  });

  it('SMS configured shows a plain empty state', () => {
    const s = html({ filter: 'sms', channelStatus: { sms: 'connected' } });
    expect(s).not.toContain("isn&#x27;t configured");
    expect(s).toContain('No conversations yet');
  });

  it('"all" tab with zero conversations keeps the original generic empty state', () => {
    const s = html({ filter: 'all' });
    expect(s).toContain('No conversations found');
  });

  it('a search query always wins, regardless of channel', () => {
    const s = html({ filter: 'instagram', searchQuery: 'jane', channelStatus: { instagram: 'disconnected' } });
    expect(s).toContain('Try a different search term');
    expect(s).not.toContain('Connect Instagram');
  });

  it('regression: a channel WITH real conversations renders the list, not any empty state', () => {
    const s = html({
      filter: 'instagram',
      channelStatus: { instagram: 'connected' },
      conversations: [
        {
          id: 'conv-1',
          last_message_at: new Date().toISOString(),
          messages: [{ content: 'hey there', direction: 'inbound', sent_at: new Date().toISOString() }],
          contacts: { first_name: 'Jane', last_name: 'Doe' },
          availablePlatforms: [{ platform: 'instagram' }],
        },
      ],
    });
    expect(s).toContain('Jane Doe');
    expect(s).toContain('hey there');
    expect(s).not.toContain('No conversations yet');
    expect(s).not.toContain('Connect Instagram');
  });
});
