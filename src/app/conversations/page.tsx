import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import ConversationsClient from './ConversationsClient';
import { getConversations, getConnectedPlatforms } from '../actions/messaging';
import { getCurrentWorkspaceId } from '@/lib/auth';

export default async function ConversationsPage() {
  const [{ data: conversations }, connectedPlatforms, workspaceId] = await Promise.all([
    getConversations(),
    getConnectedPlatforms(),
    getCurrentWorkspaceId(),
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
              workspaceId={workspaceId}
            />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
