import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import ContactsClient from './ContactsClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getWorkspaceTags } from '../actions/contacts';
import { ImportContactsModal } from '@/components/crm/ImportContactsModal';
import { DashButton } from '@/components/dashboard-ui/Button';
import { Plus } from 'lucide-react';

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
        <div className="flex flex-col h-screen bg-white overflow-hidden">
          {/* Header Section - Compact */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 sm:px-6 py-4 bg-white border-b border-dash-border shrink-0">
            <div>
              <h1 className="text-[20px] font-bold !text-dash-text leading-none mb-1">
                Relationship Management
              </h1>
              <p className="text-[12px] font-medium !text-dash-textMuted">
                Segment and manage your high-fidelity database relationships
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ImportContactsModal />
              <DashButton asChild size="sm">
                <Link href="/contacts/new">
                  <Plus size={14} />
                  Add lead
                </Link>
              </DashButton>
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

