import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import ConversationsClient from './ConversationsClient';
import { getConversations, getConnectedPlatforms } from '../actions/messaging';

export default async function ConversationsPage() {
  const [{ data: conversations }, connectedPlatforms] = await Promise.all([
    getConversations(),
    getConnectedPlatforms(),
  ]);

  return (
    <MetaData pageTitle="Communications Hub">
      <Wrapper>
        <div className="flex flex-col h-screen bg-dash-bg">
          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <ConversationsClient
              initialConversations={conversations || []}
              connectedPlatforms={connectedPlatforms || []}
            />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
