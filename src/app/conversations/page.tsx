import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import ConversationsClient from './ConversationsClient';
import { getConversations } from '../actions/messaging';

export default async function ConversationsPage() {
  const { data: conversations, error } = await getConversations();

  return (
    <MetaData pageTitle="Communications Hub">
      <Wrapper>
        <div className="flex flex-col h-screen bg-[#04091a]">
          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <ConversationsClient initialConversations={conversations || []} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
