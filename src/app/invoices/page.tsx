import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getInvoices } from "@/app/actions/finance";
import { InvoiceMasterDetail } from "@/components/invoices/InvoiceMasterDetail";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
 const user = await requireAuth();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) redirect('/login');
 
 const invoices = await getInvoices(workspaceId);

  return (
    <MetaData pageTitle="Billing Ledger">
      <Wrapper>
        <div className="flex flex-col min-h-screen">
          <div className="page-header px-6 py-6 flex-shrink-0 bg-[var(--n900)] border-b border-white/5">
            <div className="ph-left">
              <h1 className="text-3xl font-black font-space text-[var(--t1)] uppercase tracking-tight">
                BILLING <span className="text-[var(--accent2)]">LEDGER</span>
              </h1>
              <p className="text-[11px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">
                Comprehensive financial orchestration
              </p>
            </div>
            <div className="ph-right">
              <Link href="/invoices/new">
                <button className="btn-primary !h-12 !px-8 text-xs font-black uppercase tracking-widest gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Invoice</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="flex-1 bg-[var(--n900)]">
            <InvoiceMasterDetail invoices={invoices} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
