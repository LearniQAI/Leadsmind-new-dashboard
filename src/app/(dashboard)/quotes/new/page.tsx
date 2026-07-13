import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getContactsForInvoicing } from "@/app/actions/finance";
import QuoteClientWrapper from "@/components/quotes/QuoteClientWrapper";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import { DashButton } from "@/components/dashboard-ui/Button";

export const dynamic = 'force-dynamic';

export default async function NewQuotePage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();

  const contacts = await getContactsForInvoicing(workspaceId!);

  return (
    <MetaData pageTitle="New Proposal">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-6 shrink-0 bg-white border-b border-dash-border">
            <div>
              <h1 className="text-3xl font-bold !text-dash-text">
                New <span className="text-dash-accent">Proposal</span>
              </h1>
              <p className="text-[12px] !text-dash-textMuted mt-2 font-medium">
                Draft a new business proposal for your client
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
                items: []
              }}
            />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
