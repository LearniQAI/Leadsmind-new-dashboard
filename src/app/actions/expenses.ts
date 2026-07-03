'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getExpensesLive() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { data: [] };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('accounting_transactions')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('date', { ascending: false });

  if (error) throw error;
  return { data: data || [] };
 } catch (error: any) {
  console.error('[expenses] fetch error:', error);
  return { data: [] };
 }
}

export async function createExpense(expense: {
 description: string;
 amount: number;
 category?: string;
 date?: string;
 status?: string;
 vendor?: string;
 notes?: string;
}) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('accounting_transactions')
   .insert({
    workspace_id: workspaceId,
    type: 'expense',
    description: expense.description,
    amount: expense.amount,
    category: expense.category || 'General',
    date: expense.date || new Date().toISOString().split('T')[0],
    status: expense.status || 'unpaid',
    vendor: expense.vendor || '',
    notes: expense.notes || ''
   })
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/finance/expenses');
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateExpense(id: string, updates: Partial<{
 description: string;
 amount: number;
 category: string;
 date: string;
 status: string;
 vendor: string;
 notes: string;
}>) {
 try {
  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('accounting_transactions')
   .update({ ...updates, updated_at: new Date().toISOString() })
   .eq("id", id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/finance/expenses');
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function deleteExpense(id: string) {
 try {
  const supabase = await createServerClient();
  const { error } = await supabase.from('accounting_transactions').delete().eq("id", id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);
  if (error) throw error;
  revalidatePath('/finance/expenses');
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}
