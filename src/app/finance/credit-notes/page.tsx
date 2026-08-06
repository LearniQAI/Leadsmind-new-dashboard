import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getInvoices } from '@/app/actions/finance';
import { getCreditNotes } from '@/app/actions/creditNotes';
import { CreditNotesClient } from '@/components/finance/CreditNotesClient';
import { redirect } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';

export const dynamic = 'force-dynamic';

export default async function CreditNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  const user = await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const { invoiceId } = await searchParams;

  const [creditNotes, invoices] = await Promise.all([
    getCreditNotes(),
    getInvoices(workspaceId),
  ]);

  // Only invoices with a real outstanding balance can be credited.
  const creditableInvoices = invoices.filter((inv: any) => {
    const due = Number(inv.amount_due ?? inv.total_amount ?? 0);
    const paid = Number(inv.amount_paid ?? 0);
    return due - paid > 0;
  });

  return (
    <MetaData pageTitle="Credit Notes">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-6 shrink-0 bg-white border-b border-dash-border">
            <div>
              <h1 className="text-3xl font-bold !text-dash-text">
                Credit <span className="text-dash-accent">Notes</span>
              </h1>
              <p className="text-[12px] !text-dash-textMuted mt-2 font-medium">
                Reduce what a customer owes without recording a refund of already-paid money
              </p>
            </div>
          </div>

          <div className="flex-1 bg-white">
            <CreditNotesClient
              creditNotes={creditNotes}
              invoices={creditableInvoices}
              defaultInvoiceId={invoiceId || null}
            />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
