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
    <MetaData pageTitle="Invoices">
      <Wrapper>
        <div className="app__slide-wrapper">
          <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
              <div>
                <h1 className="card__title !text-4xl uppercase italic mb-1">Billing <span className="text-primary">Ledger</span></h1>
                <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Manage your financial transactions and billing</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/apps/invoices/new">
                  <Button className="btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-8 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4 mr-2" />
                    <span>New Invoice</span>
                  </Button>
                </Link>
              </div>
            </div>

            <InvoiceMasterDetail invoices={invoices} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
