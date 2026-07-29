import { requireAuth, getCurrentWorkspaceId, getUserRole } from '@/lib/auth';
import { listTags, listTagCategories } from '@/app/actions/tags';
import { listAiRecommendations } from '@/app/actions/aiRecommendations';
import { listDuplicateTagSuggestions, listTagConflicts } from '@/app/actions/tagInsights';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import Wrapper from "@/components/layouts/DefaultWrapper";
import TagManagerClient from './TagManagerClient';
import MetaData from "@/hooks/useMetaData";

export const dynamic = 'force-dynamic';

export default async function TagsPage() {
 await requireAuth();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) redirect('/auth/signin-basic');

 const [tagsRes, categoriesRes, role, recommendationsRes, duplicatesRes, conflictsRes] = await Promise.all([
  listTags(),
  listTagCategories(),
  getUserRole(),
  listAiRecommendations(),
  listDuplicateTagSuggestions(),
  listTagConflicts(),
 ]);

 const tags = tagsRes.success ? tagsRes.data : [];
 const categories = categoriesRes.success ? categoriesRes.data : [];
 const isAdmin = role === 'admin' || role === 'owner';
 const recommendations = recommendationsRes.success ? recommendationsRes.data : [];
 const duplicates = duplicatesRes.success ? duplicatesRes.data : [];
 const conflicts = conflictsRes.success ? conflictsRes.data : [];

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
      <div className="flex-1">
       <h1 className="text-3xl font-extrabold tracking-tight !text-dash-text mb-1">Tag Manager</h1>
       <p className="text-sm !text-dash-textMuted font-medium">Create, organize and assign tags across your CRM</p>
      </div>
      <Link href="/contacts/tags/analytics">
       <Button variant="ghost" className="!text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface border border-dash-border rounded-xl gap-2">
        <BarChart3 size={16} />
        Analytics
       </Button>
      </Link>
     </div>

     <TagManagerClient
      initialTags={tags}
      initialCategories={categories}
      isAdmin={isAdmin}
      initialRecommendations={recommendations}
      initialDuplicates={duplicates}
      initialConflicts={conflicts}
     />
    </div>
   </Wrapper>
  </MetaData>
 );
}
