import Wrapper from "@/components/layouts/DefaultWrapper";
import DocumentMainArea from "@/components/pagesUI/document/DocumentMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Document">
        <Wrapper>
          <DocumentMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
