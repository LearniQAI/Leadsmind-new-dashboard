import React from 'react';
import PublishedPageRenderer from '@/components/builder/PublishedPageRenderer';
import { loadPublicSitePage } from '@/lib/builder/publicSite';

// See the root sibling: publish state and the member-preview check are per request.
export const dynamic = 'force-dynamic';

export default async function PublishedSubdomainChildPage({
    params
}: {
    params: { workspaceSlug: string; subdomain: string; pageSlug: string }
}) {
    const { workspaceSlug, subdomain, pageSlug } = await params;
    const targetPath = `/${pageSlug.toLowerCase().replace(/^\/+/, '')}`;

    const site = await loadPublicSitePage(workspaceSlug, subdomain, targetPath);

    return (
        <>
            {site.isDraftPreview && (
                <div className="bg-amber-500 text-black text-center text-[10px] font-black py-1.5 uppercase tracking-[0.2em] shadow-md z-[9999] relative">
                    ⚠️ Preview Mode: This sub-route is not published. Only workspace members can see it.
                </div>
            )}
            <PublishedPageRenderer
                content={site.content}
                pageId={site.pageId}
                websiteData={site.websiteData}
                pages={site.pages}
                websiteId={site.websiteId}
                funnelId={site.funnelId}
            />
        </>
    );
}
