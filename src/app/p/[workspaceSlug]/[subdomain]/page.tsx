import React from 'react';
import PublishedPageRenderer from '@/components/builder/PublishedPageRenderer';
import { loadPublicSitePage } from '@/lib/builder/publicSite';

// Publish state is read per request: unpublishing must take a site down immediately, and the
// draft-preview check reads the visitor's session cookie.
export const dynamic = 'force-dynamic';

export default async function PublishedSubdomainRootPage({
    params
}: {
    params: { workspaceSlug: string; subdomain: string }
}) {
    const { workspaceSlug, subdomain } = await params;

    // Admin-client lookup + publish gate (404 unless published, or a workspace member previewing).
    const site = await loadPublicSitePage(workspaceSlug, subdomain, '/');

    return (
        <>
            {site.isDraftPreview && (
                <div className="bg-amber-500 text-black text-center text-[10px] font-black py-1.5 uppercase tracking-[0.2em] shadow-md z-[9999] relative">
                    ⚠️ Preview Mode: This entity is not published. Only workspace members can see it.
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
