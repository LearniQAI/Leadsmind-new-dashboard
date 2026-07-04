'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getProducts() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('products')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function createProduct(productData: any) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('products')
   .insert({ ...productData, workspace_id: workspaceId })
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/products');
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateProduct(id: string, updates: any) {
 try {
    const supabase = await createServerClient();
    const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
   .from('products')
   .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id).eq("workspace_id", workspaceId)
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/products');
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function deleteProduct(id: string) {
 try {
    const supabase = await createServerClient();
    const workspaceId = await getCurrentWorkspaceId();
    const { error } = await supabase.from('products').delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw error;
  revalidatePath('/products');
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}
