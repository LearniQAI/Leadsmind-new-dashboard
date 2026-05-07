import Wrapper from "@/components/layouts/DefaultWrapper";
import TicketsMainArea from "@/components/pagesUI/tickets/tickets/TicketsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const TicketsMain = () => {
  return (
    <>
      <MetaData pageTitle="Tickets">
        <Wrapper>
          <TicketsMainArea/>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default TicketsMain;
