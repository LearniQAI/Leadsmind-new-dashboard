import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getInvoiceById, getInvoiceSettings, getContactsForInvoicing, getProducts } from "@/app/actions/finance";
import { InvoiceBuilder } from "@/components/invoices/InvoiceBuilder";
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

  const [invoice, settingsData, contacts, products] = await Promise.all([
    getInvoiceById(id),
    getInvoiceSettings(workspaceId!),
    getContactsForInvoicing(workspaceId!),
    getProducts(workspaceId!)
  ]);

  if (!invoice) {
    redirect('/apps/invoices');
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
              <Link href="/apps/invoices">
                <Button variant="ghost" size="icon" className="text-white/40 hover:text-white rounded-xl">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <div>
                <h1 className="card__title !text-3xl uppercase italic mb-1">Edit <span className="text-primary">Invoice</span></h1>
                <p className="card__sub-title !text-[10px] uppercase tracking-[0.2em]">Update billing record {invoice.invoice_number}</p>
              </div>
            </div>

            <InvoiceBuilder 
              workspaceId={workspaceId!}
              settings={settings}
              contacts={contacts}
              products={products}
              initialData={invoice}
            />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
