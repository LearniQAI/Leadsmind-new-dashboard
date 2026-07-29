import { requireAuth, getCurrentWorkspaceId, getUserRole } from '@/lib/auth';
import { listTags, listTagCategories } from '@/app/actions/tags';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Wrapper from "@/components/layouts/DefaultWrapper";
import TagManagerClient from './TagManagerClient';
import MetaData from "@/hooks/useMetaData";

export const dynamic = 'force-dynamic';

export default async function TagsPage() {
 await requireAuth();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) redirect('/auth/signin-basic');

 const [tagsRes, categoriesRes, role] = await Promise.all([
  listTags(),
  listTagCategories(),
  getUserRole(),
 ]);

 const tags = tagsRes.success ? tagsRes.data : [];
 const categories = categoriesRes.success ? categoriesRes.data : [];
 const isAdmin = role === 'admin' || role === 'owner';

 return (
  <MetaData pageTitle="Tag Manager">
   <Wrapper>
    <div className="space-y-6 py-10 px-4 max-w-5xl mx-auto">
     <div className="flex items-center gap-4">
      <Link href="/contacts">
       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface border border-dash-border">
        <ArrowLeft size={18} />
       </Button>
      </Link>
      <div>
       <h1 className="text-3xl font-extrabold tracking-tight !text-dash-text mb-1">Tag Manager</h1>
       <p className="text-sm !text-dash-textMuted font-medium">Create, organize and assign tags across your CRM</p>
      </div>
     </div>

     <TagManagerClient initialTags={tags} initialCategories={categories} isAdmin={isAdmin} />
    </div>
   </Wrapper>
  </MetaData>
 );
}
