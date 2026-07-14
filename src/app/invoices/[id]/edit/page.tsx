import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getInvoiceById, getInvoiceSettings, getContactsForInvoicing } from "@/app/actions/finance";
import InvoiceClientWrapper from "@/components/invoices/InvoiceClientWrapper";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import { DashButton } from "@/components/dashboard-ui/Button";

interface EditInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  const { id } = await params;

  const [invoice, settingsData, contacts] = await Promise.all([
    getInvoiceById(id),
    getInvoiceSettings(workspaceId!),
    getContactsForInvoicing(workspaceId!)
  ]);

  if (!invoice) {
    redirect('/invoices');
  }

  // Ensure settings have fallbacks
  const settings = settingsData || {
    invoice_prefix: 'INV-',
    next_invoice_number: 1,
    default_terms: '',
    default_notes: '',
    company_address: '',
    company_email: '',
    company_phone: '',
    currency: 'USD'
  };

  return (
    <MetaData pageTitle={`Edit Invoice ${invoice.invoice_number}`}>
      <Wrapper>
        <div className="bg-white min-h-screen px-4 py-6">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Link href="/invoices">
                <DashButton variant="ghost" size="icon">
                  <ArrowLeft size={20} />
                </DashButton>
              </Link>
              <div>
                <h1 className="text-3xl font-bold !text-dash-text mb-1">Edit <span className="text-dash-accent">Invoice</span></h1>
                <p className="text-[11px] !text-dash-textMuted">Update billing record {invoice.invoice_number}</p>
              </div>
            </div>

            <div className="px-2">
              <InvoiceClientWrapper 
                workspaceId={workspaceId!}
                contacts={contacts}
                initialData={{
                  ...invoice,
                  due_date: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : '',
                  created_at: invoice.created_at ? new Date(invoice.created_at).toISOString().split('T')[0] : '',
                }}
              />
            </div>
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
