import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PublishedPageRenderer from '@/components/builder/PublishedPageRenderer';
import { AlertCircle } from 'lucide-react';

export default async function PublishedSubdomainRootPage({
 params
}: {
 params: { workspaceSlug: string; subdomain: string }
}) {
 const supabase = await createClient();
 const { workspaceSlug, subdomain } = await params;

 // 1. Resolve Workspace
 const { data: workspace } = await supabase
  .from('workspaces')
  .select('id')
  .eq('slug', workspaceSlug)
  .single();

 if (!workspace?.id) {
  return notFound();
 }

 // 2. Try to find a Website matching the subdomain
 const { data: website } = await supabase
  .from('websites')
  .select('*')
  .eq('workspace_id', workspace.id)
  .eq('subdomain', subdomain)
  .single();

 let targetPageContent: string | null = null;
 let isLive = false;
 let finalWebsiteData: any = null;
 let allPages: any[] = [];
 let targetWebsiteId: string | undefined;
 let targetFunnelId: string | undefined;

 if (website) {
  isLive = !!website.is_published;
  targetWebsiteId = website.id;
  finalWebsiteData = { ...website, workspaceSlug };

  // Fetch all routing pages for context
  const { data: wsPages } = await supabase
   .from('website_pages')
   .select('id, name, path, pages(content)')
   .eq('website_id', website.id);

  if (wsPages) {
   allPages = wsPages.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.path_name.replace(/^\/+/, '') || 'home'
   }));

   // Find Home page content
   const homePage = wsPages.find(p => p.path_name === '/');
   targetPageContent = (homePage?.pages as any)?.[0]?.content || null;

   if (!targetPageContent && wsPages.length > 0) {
    targetPageContent = (wsPages[0].pages as any)?.[0]?.content || null;
   }
  }
 } else {
  // 3. Try to find a Funnel matching the subdomain
  const { data: funnel } = await supabase
   .from('funnels')
   .select('*')
   .eq('workspace_id', workspace.id)
   .eq('subdomain', subdomain)
   .single();

  if (funnel) {
   isLive = !!funnel.is_published;
   targetFunnelId = funnel.id;
   finalWebsiteData = { ...funnel, workspaceSlug };

   // Fetch all funnel steps
   const { data: steps } = await supabase
    .from('funnel_steps')
    .select('id, name, path, pages(content)')
    .eq('funnel_id', funnel.id)
    .order('position', { ascending: true });

   if (steps) {
    allPages = steps.map(s => ({
     id: s.id,
     name: s.name,
     slug: s.path.replace(/^\/+/, '') || 'step'
    }));

    targetPageContent = (steps[0]?.pages as any)?.[0]?.content || null;
   }
  }
 }

 if (!targetPageContent) {
  return (
   <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black p-6 text-center">
    <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/20">
     <AlertCircle className="w-8 h-8" />
    </div>
    <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Node Pending Configuration</h1>
    <p className="text-xs text-slate-500 max-w-md">
     The requested endpoint <span className="text-primary font-bold">{subdomain}</span> exists but has no active layout assigned to its index path.
    </p>
   </div>
  );
 }

 return (
  <>
   {!isLive && (
    <div className="bg-amber-500 text-black text-center text-[10px] font-black py-1.5 uppercase tracking-[0.2em] shadow-md z-[9999] relative">
     ⚠️ Preview Mode: This entity is currently in Draft status. Publish live to unlock public routing.
    </div>
   )}
   <PublishedPageRenderer 
    content={targetPageContent} 
    websiteData={finalWebsiteData}
    pages={allPages}
    websiteId={targetWebsiteId}
    funnelId={targetFunnelId}
   />
  </>
 );
}
