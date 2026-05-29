import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getInvoiceById, getInvoiceSettings, getContactsForInvoicing } from "@/app/actions/finance";
import InvoiceClientWrapper from "@/components/invoices/InvoiceClientWrapper";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";

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
        <div className="app__slide-wrapper">
          <div className="space-y-8">
            <div className="flex items-center gap-4 px-2">
              <Link href="/invoices">
                <Button variant="ghost" size="icon" className="text-white/40 hover:text-white rounded-xl">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <div>
                <h1 className="card__title !text-3xl uppercase mb-1">Edit <span className="text-primary">Invoice</span></h1>
                <p className="card__sub-title !text-[10px] uppercase tracking-[0.2em]">Update billing record {invoice.invoice_number}</p>
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
