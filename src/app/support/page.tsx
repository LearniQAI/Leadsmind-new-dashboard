import Wrapper from "@/components/layouts/DefaultWrapper";
import TicketsMainArea from "@/components/pagesUI/tickets/tickets/TicketsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";
import { getCurrentWorkspaceId } from "@/lib/auth";

import { getSupportTickets } from "@/app/actions/operations";

const TicketsMain = async () => {
 const { data: tickets } = await getSupportTickets();
 const workspaceId = await getCurrentWorkspaceId();

 return (
  <>
   <MetaData pageTitle="Support Hub">
    <Wrapper>
     <TicketsMainArea initialTickets={tickets || []} workspaceId={workspaceId || ''} />
    </Wrapper>
   </MetaData>
  </>
 );
};

export default TicketsMain;
