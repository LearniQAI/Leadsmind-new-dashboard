import { describe, expect, it, vi, beforeEach } from 'vitest';

const refundsCreate = vi.fn();
const requireWorkspaceRole = vi.fn();

const invoiceRow = {
  id: 'inv-1',
  workspace_id: 'ws-1',
  status: 'paid',
  total_amount: 500,
  amount_paid: 500,
  stripe_payment_intent_id: null as string | null,
};

const updates: Record<string, any>[] = [];
const inserted: Record<string, any>[] = [];

vi.mock('@/lib/stripe', () => ({
  stripe: { refunds: { create: (...args: unknown[]) => refundsCreate(...args) } },
}));

vi.mock('@/lib/api/workspaceAuth', () => ({
  requireWorkspaceRole: (...args: unknown[]) => requireWorkspaceRole(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'invoices') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: invoiceRow, error: null }),
              }),
            }),
          }),
          update: (payload: Record<string, any>) => ({
            eq: () => { updates.push(payload); return Promise.resolve({ error: null }); },
          }),
        };
      }
      if (table === 'refunds') {
        return {
          insert: (payload: Record<string, any>) => {
            inserted.push(payload);
            return { select: () => ({ single: async () => ({ data: { id: 'refund-1' }, error: null }) }) };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { refundInvoice } from './refunds';

describe('refundInvoice — gateway routing', () => {
  beforeEach(() => {
    refundsCreate.mockReset();
    updates.length = 0;
    inserted.length = 0;
    requireWorkspaceRole.mockResolvedValue({ workspaceId: 'ws-1', userId: 'user-1' });
    invoiceRow.stripe_payment_intent_id = null;
  });

  it('calls a real stripe.refunds.create() when the invoice has a payment_intent, and records recordOnly:false', async () => {
    invoiceRow.stripe_payment_intent_id = 'pi_real_test_123';
    refundsCreate.mockResolvedValue({ id: 're_test_456' });

    const result = await refundInvoice('inv-1', 'customer requested', 500);

    expect(refundsCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_real_test_123',
      amount: 50000, // cents
      reason: 'requested_by_customer',
    });
    expect(result).toMatchObject({ recordOnly: false, gateway: 'stripe', amount: 500 });
    expect(updates[0]).toMatchObject({ status: 'refunded' });
    expect(inserted[0]).toMatchObject({ gateway: 'stripe', record_only: false, gateway_refund_id: 're_test_456' });
  });

  it('never calls Stripe and records recordOnly:true for a PayFast invoice (no payment_intent)', async () => {
    invoiceRow.stripe_payment_intent_id = null;

    const result = await refundInvoice('inv-1', 'customer requested', 500);

    expect(refundsCreate).not.toHaveBeenCalled();
    expect(result).toMatchObject({ recordOnly: true, gateway: 'payfast', amount: 500 });
    expect(inserted[0]).toMatchObject({ gateway: 'payfast', record_only: true, gateway_refund_id: null });
  });
});
