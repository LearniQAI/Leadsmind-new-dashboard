import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import ConversationsClient from './ConversationsClient';
import { getConversations } from '@/app/actions/messaging';

export default async function ConversationsPage() {
 const { data: conversations, error } = await getConversations();

 return (
  <Wrapper>
   <div className="p-6 h-[calc(100vh-80px)] font-body">
    <ConversationsClient initialConversations={conversations || []} />
   </div>
  </Wrapper>
 );
}
