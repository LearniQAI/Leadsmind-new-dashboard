import Wrapper from "@/components/layouts/DefaultWrapper";
import ClientDetailsMainArea from "@/components/pagesUI/clients/client-details/ClientDetailsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  const id = 1;
  return (
    <>
      <MetaData pageTitle="Client Details Static">
        <Wrapper>
          <ClientDetailsMainArea id={id} />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
