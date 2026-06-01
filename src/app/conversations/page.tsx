import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import ConversationsClient from './ConversationsClient';
import { getConversations } from '../actions/messaging';
import Link from 'next/link';

export default async function ConversationsPage() {
  const { data: conversations, error } = await getConversations();

  return (
    <MetaData pageTitle="Communications Hub">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[#04091a]">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-6 pt-5">
            <div>
              <h1 className="text-[22px] font-bold text-[#eef2ff] uppercase tracking-tight leading-none mb-1.5 font-space-grotesk">
                Communications <span className="text-[#3b82f6]">Hub</span>
              </h1>
              <p className="text-[11.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] font-dm-sans">
                Unified Messaging & Omni-channel Engagement
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/settings?tab=integrations">
                <button className="h-9 px-4 rounded-[8px] bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[13px] font-semibold font-dm-sans flex items-center gap-2 transition-all">
                  <i className="fa-solid fa-gear text-[13px] text-[#4a5a82]"></i>
                  Settings
                </button>
              </Link>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden pb-6">
            <ConversationsClient initialConversations={conversations || []} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
