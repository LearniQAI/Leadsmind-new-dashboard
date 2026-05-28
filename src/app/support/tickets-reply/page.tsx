import Wrapper from "@/components/layouts/DefaultWrapper";
import TicketsReplyMainArea from "@/components/pagesUI/tickets/tickets-reply/TicketsReplyMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";
import { getSupportTickets } from "@/app/actions/operations";

const TicketsReplyMain = async () => {
 const { data: tickets } = await getSupportTickets();

 return (
  <>
   <MetaData pageTitle="Tickets Reply">
    <Wrapper>
     <TicketsReplyMainArea initialTickets={tickets || []} />
    </Wrapper>
   </MetaData>
  </>
 );
};

export default TicketsReplyMain;
