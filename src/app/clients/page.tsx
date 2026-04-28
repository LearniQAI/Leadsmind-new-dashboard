import Wrapper from "@/components/layouts/DefaultWrapper";
import ClientMainArea from "@/components/pagesUI/clients/client-main/ClientMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Clients">
        <Wrapper>
          <ClientMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
