import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getInvoiceSettings, getContactsForInvoicing, getProducts } from "@/app/actions/finance";
import InvoiceClientWrapper from "@/components/invoices/InvoiceClientWrapper";
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
  searchParams: Promise<{ contactId?: string, type?: string }>;
}) {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  const { contactId, type } = await searchParams;

  const [settings, contacts, products] = await Promise.all([
    getInvoiceSettings(workspaceId!),
    getContactsForInvoicing(workspaceId!),
    getProducts(workspaceId!)
  ]);

  return (
    <MetaData pageTitle="New Invoice">
      <Wrapper>
        <div className="app__slide-wrapper">
          <div className="page-header px-6 py-4">
            <div className="ph-left">
              <h1 className="text-2xl font-bold font-space text-[var(--t1)]">
                NEW <span className="text-[var(--accent2)]">INVOICE</span>
              </h1>
              <p className="text-[11.5px] text-[var(--t3)] uppercase tracking-[0.8px] font-medium mt-1">
                Generate a professional billing document
              </p>
            </div>
            <div className="ph-right flex gap-3">
              <Link href="/invoices">
                <button className="btn-ghost">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span>Back to List</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="mt-6 px-6 pb-12">
            <InvoiceClientWrapper 
              workspaceId={workspaceId!}
              contacts={contacts}
              initialData={{
                contact_id: contactId,
                terms_and_conditions: settings?.default_terms || '',
                items: []
              }}
            />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
