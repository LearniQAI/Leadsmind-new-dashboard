import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getWorkspaceTags } from '@/app/actions/contacts';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Tag as TagIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Wrapper from "@/components/layouts/DefaultWrapper";
import TagsClient from './TagsClient';
import MetaData from "@/hooks/useMetaData";

export const dynamic = 'force-dynamic';

export default async function TagsPage() {
 await requireAuth();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) redirect('/auth/signin-basic');

 const tags = await getWorkspaceTags();

 return (
  <MetaData pageTitle="Manage Tags">
   <Wrapper>
    <div className="space-y-8 py-10 px-4 max-w-4xl mx-auto">
     <div className="flex items-center gap-4">
      <Link href="/apps/contacts">
       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-white/40 hover:text-white hover:bg-white/5 border border-white/5">
        <ArrowLeft size={18} />
       </Button>
      </Link>
      <div>
       <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">Manage Tags</h1>
       <p className="text-sm text-white/40 font-medium">Organize and clean up your contact segments</p>
      </div>
     </div>

     <div className="bg-card border border-borderLight rounded-3xl p-8 shadow-xl">
      <TagsClient initialTags={tags} />
     </div>
    </div>
   </Wrapper>
  </MetaData>
 );
}
