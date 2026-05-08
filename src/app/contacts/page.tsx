import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { ContactTable } from '@/components/crm/ContactTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Tag as TagIcon, Users, X } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ImportContactsModal } from '@/components/crm/ImportContactsModal';
import { getWorkspaceTags } from '@/app/actions/contacts';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";

export const dynamic = 'force-dynamic';

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { q?: string; tag?: string };
}) {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/login');

  const supabase = await createServerClient();
  const { q, tag } = searchParams;
  const query = q || '';

  let dbQuery = supabase
    .from('contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (query) {
    dbQuery = dbQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`);
  }

  if (tag) {
    dbQuery = dbQuery.contains('tags', [tag]);
  }

  const { data: contacts, error } = await dbQuery;
  const allTags = await getWorkspaceTags(workspaceId);

  if (error) {
    console.error('Error fetching contacts:', error);
  }

  return (
    <MetaData pageTitle="Contacts">
      <Wrapper>
        <div className="app__slide-wrapper">
          <div className="grid grid-cols-12 gap-x-5">
            <div className="col-span-12">
              <div className="card__wrapper no-height">
                <div className="card__title-wrap flex flex-col md:flex-row md:items-center justify-between mb-[20px] gap-4">
                  <div className="space-y-1">
                    <h5 className="card__heading-title flex items-center gap-2 uppercase tracking-tighter">
                      <Users className="text-primary" size={20} /> Contacts
                    </h5>
                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Segment and manage database relationships</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/contacts/tags" className="btn btn-md btn-outline-theme-border !rounded-xl text-[10px] uppercase font-black tracking-widest">
                      <TagIcon size={14} className="mr-2" /> Manage Tags
                    </Link>
                    <ImportContactsModal />
                    <Link href="/contacts/new" className="btn btn-md btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest shadow-lg shadow-primary/20">
                      <Plus size={16} className="mr-2" /> Add Contact
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/10 group-focus-within:text-primary">
                      <Search className="h-4 w-4" />
                    </div>
                    <form action="/contacts" method="GET">
                      <input
                        name="q"
                        defaultValue={query}
                        placeholder="Search by name, email, or phone..."
                        className="w-full pl-11 h-12 bg-white/[0.03] border border-white/5 text-white placeholder:text-white/10 rounded-xl focus:border-white/20 transition-all outline-none"
                      />
                      {tag && <input type="hidden" name="tag" value={tag} />}
                    </form>
                  </div>

                  {allTags.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                      <Link href="/contacts" className={`btn btn-sm rounded-lg text-[9px] uppercase font-black tracking-widest ${!tag ? 'btn-primary' : 'btn-outline-theme-border opacity-40'}`}>
                        All
                      </Link>
                      {allTags.slice(0, 5).map(t => (
                        <Link key={t.name} href={`/contacts?tag=${t.name}${query ? `&q=${query}` : ''}`} className={`btn btn-sm rounded-lg text-[9px] uppercase font-black tracking-widest ${tag === t.name ? 'btn-primary' : 'btn-outline-theme-border opacity-40'}`}>
                          {t.name}
                        </Link>
                      ))}
                      {tag && (
                        <Link href="/contacts" className="btn btn-icon btn-sm btn-outline-danger rounded-lg">
                          <X size={12} />
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                <ContactTable contacts={contacts || []} />
              </div>
            </div>
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}

