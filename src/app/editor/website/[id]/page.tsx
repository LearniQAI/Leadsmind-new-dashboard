import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

export default async function WebsiteEditorRedirectPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = await params;

    // Find the home page for this website
    // We query website_pages and join to pages(id)
    const { data: websitePage } = await supabase
        .from('website_pages')
        .select('id, pages(id)')
        .eq('website_id', id)
        .eq('path_name', '/')
        .single();

    const homePageId = (websitePage?.pages as any)?.[0]?.id;

    if (homePageId) {
        redirect(`/editor/website/${id}/${homePageId}`);
    }

    // Fallback: try to find ANY page for this website
    const { data: anyPage } = await supabase
        .from('website_pages')
        .select('id, pages(id)')
        .eq('website_id', id)
        .limit(1)
        .single();

    const fallbackPageId = (anyPage?.pages as any)?.[0]?.id;

    if (fallbackPageId) {
        redirect(`/editor/website/${id}/${fallbackPageId}`);
    }

    // AUTO-REPAIR: If no website page exists for this website, automatically instantiate the base layout to avoid 404s.
    const { data: website } = await supabase
        .from('websites')
        .select('workspace_id')
        .eq('id', id)
        .single();

    if (!website?.workspace_id) {
        return notFound();
    }

    // Insert default website page
    const { data: newWsPage, error: wsPageErr } = await supabase
        .from('website_pages')
        .insert({
            website_id: id,
            name: 'Home',
            path_name: '/'
        })
        .select()
        .single();

    if (wsPageErr || !newWsPage) {
        return notFound();
    }

    // Insert default CraftJS page content linked to website page
    const initialContent = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';
    const { data: newContentPage, error: pageErr } = await supabase
        .from('pages')
        .insert({
            workspace_id: website.workspace_id,
            website_page_id: newWsPage.id,
            name: 'Home',
            content: initialContent,
            status: 'draft'
        })
        .select()
        .single();

    if (pageErr || !newContentPage) {
        return notFound();
    }

    redirect(`/editor/website/${id}/${newContentPage.id}`);
}
