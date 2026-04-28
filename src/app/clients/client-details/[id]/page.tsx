import Wrapper from "@/components/layouts/DefaultWrapper";
import ClientDetailsMainArea from "@/components/pagesUI/clients/client-details/ClientDetailsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = ({ params }: { params: { id: number } }) => {
  const id = params.id;
  return (
    <>
      <MetaData pageTitle="Client Details Dynamic">
        <Wrapper>
          <ClientDetailsMainArea id={id} />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
