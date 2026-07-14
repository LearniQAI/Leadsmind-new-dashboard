import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getInvoiceSettings, getContactsForInvoicing, getProducts } from "@/app/actions/finance";
import InvoiceClientWrapper from "@/components/invoices/InvoiceClientWrapper";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import { DashButton } from "@/components/dashboard-ui/Button";

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
        <div className="bg-white min-h-screen">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 border-b border-dash-border">
            <div>
              <h1 className="text-2xl font-bold !text-dash-text">
                New <span className="text-dash-accent">Invoice</span>
              </h1>
              <p className="text-[12px] !text-dash-textMuted font-medium mt-1">
                Generate a professional billing document
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/invoices">
                <DashButton variant="ghost">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to List</span>
                </DashButton>
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
