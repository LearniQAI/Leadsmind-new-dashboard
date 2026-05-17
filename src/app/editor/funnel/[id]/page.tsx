import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

export default async function FunnelEditorRedirectPage({ params }: { params: { id: string } }) {
 const supabase = await createClient();
 const { id } = await params;

 // Find the first step for this funnel ordered by 'position'
 const { data: firstStep } = await supabase
  .from('funnel_steps')
  .select('id, pages(id)')
  .eq('funnel_id', id)
  .order('position', { ascending: true })
  .limit(1)
  .single();

 const firstPageId = (firstStep?.pages as any)?.[0]?.id;

 if (firstPageId) {
  redirect(`/editor/funnel/${id}/${firstPageId}`);
 }

 // Fallback: try to find ANY page linked to this funnel
 const { data: anyStep } = await supabase
  .from('funnel_steps')
  .select('id, pages(id)')
  .eq('funnel_id', id)
  .limit(1)
  .single();
 
 const fallbackPageId = (anyStep?.pages as any)?.[0]?.id;
 
 if (fallbackPageId) {
  redirect(`/editor/funnel/${id}/${fallbackPageId}`);
 }

 // AUTO-REPAIR: If no step or page exists for this funnel, gracefully create them now to avoid 404 dead-ends.
 const { data: funnel } = await supabase
  .from('funnels')
  .select('workspace_id')
  .eq('id', id)
  .single();

 if (!funnel?.workspace_id) {
  return notFound();
 }

 // Insert default funnel step
 const { data: newStep, error: stepErr } = await supabase
  .from('funnel_steps')
  .insert({
   funnel_id: id,
   workspace_id: funnel.workspace_id,
   name: 'Opt-in Page',
   path: '/',
   position: 1
  })
  .select()
  .single();

 if (stepErr || !newStep) {
  return notFound();
 }

 // Insert default CraftJS page content linked to funnel step
 const initialContent = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';
 const { data: newPage, error: pageErr } = await supabase
  .from('pages')
  .insert({
   workspace_id: funnel.workspace_id,
   funnel_step_id: newStep.id,
   name: 'Opt-in Page',
   content: initialContent,
   status: 'draft'
  })
  .select()
  .single();

 if (pageErr || !newPage) {
  return notFound();
 }

 redirect(`/editor/funnel/${id}/${newPage.id}`);
}
