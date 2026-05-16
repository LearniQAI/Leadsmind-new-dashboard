import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getContactsForInvoicing } from "@/app/actions/finance";
import QuoteClientWrapper from "@/components/quotes/QuoteClientWrapper";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";

export const dynamic = 'force-dynamic';

export default async function NewQuotePage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();

  const contacts = await getContactsForInvoicing(workspaceId!);

  return (
    <MetaData pageTitle="New Proposal">
      <Wrapper>
        <div className="flex flex-col min-h-screen">
          <div className="page-header px-6 py-6 flex-shrink-0 bg-[var(--n900)] border-b border-white/5">
            <div className="ph-left">
              <h1 className="text-3xl font-black font-space text-[var(--t1)] uppercase tracking-tight">
                NEW <span className="text-[var(--accent2)]">PROPOSAL</span>
              </h1>
              <p className="text-[11px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">
                Draft a new business proposal for your client
              </p>
            </div>
            <div className="ph-right flex gap-3">
              <Link href="/quotes">
                <button className="btn-ghost">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span>Back to Quotes</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="flex-1 bg-[var(--n900)] pt-8 pb-12">
            <QuoteClientWrapper 
              workspaceId={workspaceId!}
              contacts={contacts}
              initialData={{
                items: []
              }}
            />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
