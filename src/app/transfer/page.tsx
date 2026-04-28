import Wrapper from "@/components/layouts/DefaultWrapper";
import TransferMainArea from "@/components/pagesUI/transfer/TransferMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Transfer">
        <Wrapper>
          <TransferMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
