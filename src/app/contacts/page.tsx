import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import ContactsClient from './ContactsClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getWorkspaceTags } from '../actions/contacts';
import { ImportContactsModal } from '@/components/crm/ImportContactsModal';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const supabase = await createServerClient();
  const [contactsRes, tagsRes, membersRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    getWorkspaceTags(),
    supabase
      .from('workspace_members')
      .select('user_id, user:users(first_name, last_name)')
      .eq('workspace_id', workspaceId)
  ]);

  const contacts = contactsRes.data || [];
  const tags = tagsRes || [];
  const owners = (membersRes.data || []).map((m: any) => ({
    id: m.user_id,
    name: m.user ? `${m.user.first_name} ${m.user.last_name}`.trim() : 'Unknown Personnel'
  }));

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
              <ImportContactsModal />
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
            <ContactsClient initialContacts={contacts} initialTags={tags} owners={owners} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}

