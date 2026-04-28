import Wrapper from "@/components/layouts/DefaultWrapper";
import TicketsReplyMainArea from "@/components/pagesUI/tickets/tickets-reply/TicketsReplyMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const TicketsReplyMain = () => {
  return (
    <>
      <MetaData pageTitle="Tickets Reply">
        <Wrapper>
          <TicketsReplyMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default TicketsReplyMain;
