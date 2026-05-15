import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import ContactsClient from './ContactsClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/login');

  const supabase = await createServerClient();
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contacts:', error);
  }

  return (
    <MetaData pageTitle="Relationship Management">
      <Wrapper>
        <div className="flex flex-col h-screen bg-[#04091a] overflow-hidden">
          {/* Header Section - Compact */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-[#04091a] border-b border-white/5 shrink-0">
            <div>
              <h1 className="text-[20px] font-bold text-[#eef2ff] uppercase tracking-tight leading-none mb-1 font-space-grotesk">
                Relationship <span className="text-[#3b82f6]">Management</span>
              </h1>
              <p className="text-[10.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] font-dm-sans">
                Segment and manage your high-fidelity database relationships
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button className="h-8 px-3 rounded-[6px] bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[12px] font-semibold font-dm-sans flex items-center gap-2 transition-all">
                <i className="fa-solid fa-file-import text-[12px] text-[#4a5a82]"></i>
                Import
              </button>
              <Link
                href="/contacts/new"
                className="h-8 px-3 rounded-[6px] bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[12px] font-bold font-dm-sans flex items-center gap-2 transition-all shadow-lg shadow-[#2563eb]/20"
              >
                <i className="fa-solid fa-plus text-[11px]"></i>
                Add Lead
              </Link>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <ContactsClient initialContacts={contacts || []} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}

