import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getInvoiceSettings, getContactsForInvoicing, getProducts } from "@/app/actions/finance";
import { InvoiceBuilder } from "@/components/invoices/InvoiceBuilder";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string }>;
}) {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  const { contactId } = await searchParams;

  const [settings, contacts, products] = await Promise.all([
    getInvoiceSettings(workspaceId!),
    getContactsForInvoicing(workspaceId!),
    getProducts(workspaceId!)
  ]);

  return (
    <MetaData pageTitle="New Invoice">
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
                <h1 className="card__title !text-3xl uppercase italic mb-1">New <span className="text-primary">Invoice</span></h1>
                <p className="card__sub-title !text-[10px] uppercase tracking-[0.2em]">Generate a professional billing document</p>
              </div>
            </div>

            <InvoiceBuilder 
              workspaceId={workspaceId!}
              contacts={contacts} 
              products={products} 
              settings={settings || {
                 id: "default",
                 workspace_id: workspaceId!,
                 invoice_prefix: "INV-",
                 next_invoice_number: 1,
                 quote_prefix: "QT-",
                 next_quote_number: 1,
                 default_terms: "",
                 default_notes: "",
                 company_address: "",
                 company_email: "",
                 company_phone: "",
                 logo_url: null
              }} 
              initialData={{ contact_id: contactId }}
            />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
