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
  
  if (!fallbackPageId) return notFound();
  
  redirect(`/editor/website/${id}/${fallbackPageId}`);
}
