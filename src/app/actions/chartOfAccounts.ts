'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { ValidationError, toClientError } from '@/shared/errors/AppError';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (e) {
    // Gracefully handle next/cache bailout when run outside server context
  }
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

// Standard South African small-business chart of accounts. Codes 1000, 4000,
// and 5000 intentionally match the accounts src/lib/calendar/accountingHook.ts
// already auto-creates for PayFast payments (Bank, Consultation Fee Revenue,
// PayFast Merchant Fees) — seeding under the same code/name means that hook's
// getOrCreateAccount lookup finds these instead of creating duplicates.
const SA_STANDARD_ACCOUNTS: Array<{
  code: string; name: string; type: AccountType; category?: string; tax_category?: string;
}> = [
  { code: '1000', name: 'Bank / Cash at Bank', type: 'asset', category: 'current_asset' },
  { code: '1010', name: 'Petty Cash', type: 'asset', category: 'current_asset' },
  { code: '1100', name: 'Accounts Receivable (Debtors)', type: 'asset', category: 'current_asset' },
  { code: '1200', name: 'Prepaid Expenses', type: 'asset', category: 'current_asset' },
  { code: '1500', name: 'Equipment & Computer Hardware', type: 'asset', category: 'fixed_asset' },
  { code: '1600', name: 'Accumulated Depreciation', type: 'asset', category: 'fixed_asset' },

  { code: '2000', name: 'Accounts Payable (Creditors)', type: 'liability', category: 'current_liability' },
  { code: '2100', name: 'VAT Control Account', type: 'liability', category: 'current_liability', tax_category: 'VAT201' },
  { code: '2200', name: 'PAYE / SDL / UIF Payable', type: 'liability', category: 'current_liability', tax_category: 'EMP201' },
  { code: '2300', name: 'Accrued Expenses', type: 'liability', category: 'current_liability' },
  { code: '2500', name: "Director's Loan Account", type: 'liability', category: 'long_term_liability' },

  { code: '3000', name: "Owner's Equity / Share Capital", type: 'equity' },
  { code: '3100', name: 'Retained Earnings', type: 'equity' },
  { code: '3200', name: 'Drawings', type: 'equity' },

  { code: '4000', name: 'Consultation Fee Revenue', type: 'revenue' },
  { code: '4100', name: 'Product Sales', type: 'revenue' },
  { code: '4900', name: 'Other Income', type: 'revenue' },

  { code: '5000', name: 'PayFast Merchant Fees', type: 'expense' },
  { code: '5100', name: 'Salaries & Wages', type: 'expense' },
  { code: '5200', name: 'Rent', type: 'expense' },
  { code: '5300', name: 'Utilities', type: 'expense' },
  { code: '5400', name: 'Marketing & Advertising', type: 'expense' },
  { code: '5500', name: 'Software & Subscriptions', type: 'expense' },
  { code: '5600', name: 'Travel', type: 'expense' },
  { code: '5700', name: 'Professional Fees (Accounting/Legal)', type: 'expense' },
  { code: '5900', name: 'Bank Charges', type: 'expense' },
];

async function seedDefaultAccounts(supabase: any, workspaceId: string) {
  const rows = SA_STANDARD_ACCOUNTS.map(a => ({ ...a, workspace_id: workspaceId, is_system: true }));
  const { error } = await supabase.from('chart_of_accounts').insert(rows);
  if (error) {
    logger.error({ err: error, workspaceId }, 'finance.chart_of_accounts.seed.failed');
  }
}

export async function getAccounts() {
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return [];
  }

  const supabase = await createServerClient();

  const { count } = await supabase
    .from('chart_of_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  if (!count) {
    await seedDefaultAccounts(supabase, workspaceId);
  }

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('code', { ascending: true });

  if (error) {
    logger.error({ err: error, workspaceId }, 'finance.chart_of_accounts.fetch.failed');
    return [];
  }
  return data || [];
}

export async function createAccount(data: {
  code: string;
  name: string;
  type: AccountType;
  category?: string;
  parentId?: string | null;
  taxCategory?: string;
}) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  try {
    if (!data.code?.trim()) throw new ValidationError('Enter an account code.');
    if (!data.name?.trim()) throw new ValidationError('Enter an account name.');
    if (!['asset', 'liability', 'equity', 'revenue', 'expense'].includes(data.type)) {
      throw new ValidationError('Select a valid account type.');
    }

    const { data: account, error } = await supabase
      .from('chart_of_accounts')
      .insert({
        workspace_id: workspaceId,
        code: data.code.trim(),
        name: data.name.trim(),
        type: data.type,
        category: data.category || null,
        parent_id: data.parentId || null,
        tax_category: data.taxCategory || null,
        is_system: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: `Account code ${data.code} is already in use.` };
      }
      logger.error({ err: error, workspaceId }, 'finance.chart_of_accounts.create.failed');
      return { success: false, error: 'Failed to create account.' };
    }

    safeRevalidatePath('/finance/chart-of-accounts');
    return { success: true, account };
  } catch (err) {
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

export async function updateAccount(id: string, data: {
  code: string;
  name: string;
  type: AccountType;
  category?: string;
  parentId?: string | null;
  taxCategory?: string;
}) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  try {
    if (!data.code?.trim()) throw new ValidationError('Enter an account code.');
    if (!data.name?.trim()) throw new ValidationError('Enter an account name.');

    if (data.parentId === id) {
      throw new ValidationError('An account cannot be its own parent.');
    }

    const { data: account, error } = await supabase
      .from('chart_of_accounts')
      .update({
        code: data.code.trim(),
        name: data.name.trim(),
        type: data.type,
        category: data.category || null,
        parent_id: data.parentId || null,
        tax_category: data.taxCategory || null,
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: `Account code ${data.code} is already in use.` };
      }
      logger.error({ err: error, id, workspaceId }, 'finance.chart_of_accounts.update.failed');
      return { success: false, error: 'Failed to update account.' };
    }

    safeRevalidatePath('/finance/chart-of-accounts');
    return { success: true, account };
  } catch (err) {
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

export async function deleteAccount(id: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { count: journalCount } = await supabase
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', id)
    .eq('workspace_id', workspaceId);

  if (journalCount) {
    return { success: false, error: 'This account has recorded transactions and cannot be deleted.' };
  }

  const { count: childCount } = await supabase
    .from('chart_of_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id)
    .eq('workspace_id', workspaceId);

  if (childCount) {
    return { success: false, error: 'This account has sub-accounts. Reassign or delete them first.' };
  }

  const { error } = await supabase
    .from('chart_of_accounts')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) {
    logger.error({ err: error, id, workspaceId }, 'finance.chart_of_accounts.delete.failed');
    return { success: false, error: 'Failed to delete account.' };
  }

  safeRevalidatePath('/finance/chart-of-accounts');
  return { success: true };
}
