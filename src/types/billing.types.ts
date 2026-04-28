export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface BillingInvoice {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  stripe_invoice_id: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
}

export interface StripeCustomer {
  id: string;
  workspace_id: string;
  contact_id: string;
  stripe_customer_id: string;
  created_at: string;
}

export interface RevenueStats {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  currency: string;
}
