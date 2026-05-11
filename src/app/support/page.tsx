import Wrapper from "@/components/layouts/DefaultWrapper";
import TicketsMainArea from "@/components/pagesUI/tickets/tickets/TicketsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

import { getSupportTickets } from "@/app/actions/operations";

const TicketsMain = async () => {
 const { data: tickets } = await getSupportTickets();

 return (
  <>
   <MetaData pageTitle="Support Hub">
    <Wrapper>
     <TicketsMainArea initialTickets={tickets || []} />
    </Wrapper>
   </MetaData>
  </>
 );
};

export default TicketsMain;
