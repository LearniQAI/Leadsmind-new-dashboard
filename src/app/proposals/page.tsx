import { requireAuth, getCurrentWorkspaceId } from "@/lib/auth";
import { getQuotes } from "@/app/actions/finance";
import { ProposalMasterDetail } from "@/components/proposals/ProposalMasterDetail";
import { redirect } from "next/navigation";

import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function ProposalsPage() {
 const user = await requireAuth();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) redirect('/login');

 const proposals = await getQuotes(workspaceId);

 return (
  <MetaData pageTitle="Proposals">
   <Wrapper>
    <div className="app__slide-wrapper">
     <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
       <div>
        <h1 className="card__title !text-4xl uppercase mb-1">Proposal <span className="text-primary">Studio</span></h1>
        <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Craft and manage your business estimates</p>
       </div>
       <div className="flex items-center gap-3">
        <Link href="/invoices/new?type=proposal">
         <Button className="btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-8 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" />
          <span>Create Proposal</span>
         </Button>
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
