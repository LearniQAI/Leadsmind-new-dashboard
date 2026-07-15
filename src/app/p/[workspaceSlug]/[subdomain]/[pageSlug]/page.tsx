import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PublishedPageRenderer from '@/components/builder/PublishedPageRenderer';
import { AlertCircle } from 'lucide-react';

export default async function PublishedSubdomainChildPage({
    params
}: {
    params: { workspaceSlug: string; subdomain: string; pageSlug: string }
}) {
    const supabase = await createClient();
    const { workspaceSlug, subdomain, pageSlug } = await params;

    // 1. Resolve Workspace
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', workspaceSlug)
        .single();

    if (!workspace?.id) {
        return notFound();
    }

    const targetPath = `/${pageSlug.toLowerCase().replace(/^\/+/, '')}`;

    // 2. Try to find Website matching subdomain
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
            .select('id, name, path_name, pages(content)')
            .eq('website_id', website.id);

        if (wsPages) {
            allPages = wsPages.map(p => ({
                id: p.id,
                name: p.name,
                slug: p.path_name.replace(/^\/+/, '') || 'home'
            }));

            // Match specific path
            const matchPage = wsPages.find(p => p.path_name === targetPath);
            targetPageContent = (matchPage?.pages as any)?.[0]?.content || null;
        }
    } else {
        // 3. Try Funnel matching subdomain
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
                .select('id, name, path_name, pages(content)')
                .eq('funnel_id', funnel.id)
                .order('order', { ascending: true });

            if (steps) {
                allPages = steps.map(s => ({
                    id: s.id,
                    name: s.name,
                    slug: s.path_name.replace(/^\/+/, '') || 'step'
                }));

                const matchStep = steps.find(s => s.path_name === targetPath);
                targetPageContent = (matchStep?.pages as any)?.[0]?.content || null;
            }
        }
    }

    if (!targetPageContent) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-bgBody dark:bg-bgBody-dark text-heading dark:text-heading-dark p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 border border-rose-500/20">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight mb-2">404: Sub-Route Unresolved</h1>
                <p className="text-xs text-placeholder max-w-md">
                    The entity path <span className="text-primary font-bold">{targetPath}</span> is not registered under the subdomain configuration <span className="text-heading font-bold">{subdomain}</span>.
                </p>
            </div>
        );
    }

    return (
        <>
            {!isLive && (
                <div className="bg-amber-500 text-black text-center text-[10px] font-black py-1.5 uppercase tracking-[0.2em] shadow-md z-[9999] relative">
                    ⚠️ Preview Mode: This sub-route is currently in Draft status. Publish live to unlock public routing.
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
