import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getWorkspaceTags } from '@/app/actions/contacts';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Tag as TagIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";

export const dynamic = 'force-dynamic';

export default async function TagsPage() {
 await requireAuth();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) redirect('/login');

 const tags = await getWorkspaceTags(workspaceId);

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

     <div className="bg-[#0b0b10] border border-white/5 rounded-3xl p-8 shadow-2xl">
      <div className="grid gap-4">
       {tags.length === 0 ? (
        <div className="py-20 text-center">
         <TagIcon size={40} className="mx-auto text-white/5 mb-4" />
         <p className="text-white/20 font-bold uppercase tracking-widest">No tags created yet</p>
        </div>
       ) : (
        tags.map((tag) => (
         <div key={tag.name} className="flex items-center justify-between p-4 rounded-2xl bg-white/3 border border-white/5 group hover:bg-white/5 transition-all">
          <div className="flex items-center gap-4">
           <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <TagIcon size={18} className="text-blue-400" />
           </div>
           <div>
            <p className="text-sm font-bold text-white uppercase tracking-tight">{tag.name}</p>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{tag.count} contacts</p>
           </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg">
             <Trash2 size={16} />
            </Button>
          </div>
         </div>
        ))
       )}
      </div>
     </div>
    </div>
   </Wrapper>
  </MetaData>
 );
}
