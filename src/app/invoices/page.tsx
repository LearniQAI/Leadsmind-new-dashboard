import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getInvoices } from "@/app/actions/finance";
import { InvoiceMasterDetail } from "@/components/invoices/InvoiceMasterDetail";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import Link from "next/link";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import { DashButton } from "@/components/dashboard-ui/Button";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
 const user = await requireAuth();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) redirect('/auth/signin-basic');
 
 const invoices = await getInvoices(workspaceId);

  return (
    <MetaData pageTitle="Billing Ledger">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-6 shrink-0 bg-white border-b border-dash-border">
            <div>
              <h1 className="text-3xl font-bold !text-dash-text">
                Billing <span className="text-dash-accent">Ledger</span>
              </h1>
              <p className="text-[12px] !text-dash-textMuted mt-2 font-medium">
                Comprehensive financial orchestration
              </p>
            </div>
            <div>
              <Link href="/invoices/new">
                <DashButton variant="primary" size="lg">
                  <Plus className="h-4 w-4" />
                  <span>Create Invoice</span>
                </DashButton>
              </Link>
            </div>
          </div>

          <div className="flex-1 bg-white">
            <InvoiceMasterDetail invoices={invoices} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
