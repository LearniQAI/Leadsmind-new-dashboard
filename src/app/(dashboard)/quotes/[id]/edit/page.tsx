import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getContactsForInvoicing } from "@/app/actions/finance";
import { getQuoteById } from "@/app/actions/quotes";
import QuoteClientWrapper from "@/components/quotes/QuoteClientWrapper";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import { notFound } from "next/navigation";
import { DashButton } from "@/components/dashboard-ui/Button";

export const dynamic = 'force-dynamic';

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  const { id } = await params;

  const [quote, contacts] = await Promise.all([
    getQuoteById(id),
    getContactsForInvoicing(workspaceId!)
  ]);

  if (!quote) {
    notFound();
  }

  return (
    <MetaData pageTitle={`Edit Quote ${quote.quote_number}`}>
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-6 shrink-0 bg-white border-b border-dash-border">
            <div>
              <h1 className="text-3xl font-bold !text-dash-text">
                Edit <span className="text-dash-accent">Proposal</span>
              </h1>
              <p className="text-[12px] !text-dash-textMuted mt-2 font-medium">
                Update details for {quote.quote_number}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/quotes">
                <DashButton variant="ghost">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Quotes</span>
                </DashButton>
              </Link>
            </div>
          </div>

          <div className="flex-1 bg-white pt-8 pb-12">
            <QuoteClientWrapper 
              workspaceId={workspaceId!}
              contacts={contacts}
              initialData={{
                ...quote,
                invoice_number: quote.quote_number,
                due_date: quote.valid_until ? new Date(quote.valid_until).toISOString().split('T')[0] : '',
                created_at: quote.created_at ? new Date(quote.created_at).toISOString().split('T')[0] : '',
              }}
              quoteId={id}
            />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
