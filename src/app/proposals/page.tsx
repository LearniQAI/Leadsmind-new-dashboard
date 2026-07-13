import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getQuotes } from "@/app/actions/finance";
import { ProposalMasterDetail } from "@/components/proposals/ProposalMasterDetail";
import { redirect } from "next/navigation";

import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import { DashButton } from "@/components/dashboard-ui/Button";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function ProposalsPage() {
 const user = await requireAuth();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) redirect('/auth/signin-basic');

 const proposals = await getQuotes(workspaceId);

 return (
  <MetaData pageTitle="Proposals">
   <Wrapper>
    <div className="px-4 py-6">
     <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
       <div>
        <h1 className="text-3xl font-bold !text-dash-text mb-1">Proposal <span className="text-dash-accent">Studio</span></h1>
        <p className="text-[13px] !text-dash-textMuted">Craft and manage your business estimates</p>
       </div>
       <div className="flex items-center gap-3">
        <Link href="/invoices/new?type=proposal">
         <DashButton variant="primary">
          <Plus className="h-4 w-4" />
          <span>Create Proposal</span>
         </DashButton>
        </Link>
       </div>
      </div>

      <ProposalMasterDetail proposals={proposals} />
     </div>
    </div>
   </Wrapper>
  </MetaData>
 );
}
