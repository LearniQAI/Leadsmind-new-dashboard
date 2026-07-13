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
       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface border border-dash-border">
        <ArrowLeft size={18} />
       </Button>
      </Link>
      <div>
       <h1 className="text-3xl font-extrabold tracking-tight !text-dash-text mb-1">Manage tags</h1>
       <p className="text-sm !text-dash-textMuted font-medium">Organize and clean up your contact segments</p>
      </div>
     </div>

     <div className="bg-white border border-dash-border rounded-2xl p-8 shadow-sm">
      <TagsClient initialTags={tags} />
     </div>
    </div>
   </Wrapper>
  </MetaData>
 );
}
