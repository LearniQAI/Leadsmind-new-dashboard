import Wrapper from "@/components/layouts/DefaultWrapper";
import TabelBasicMain from "@/components/tables/table-basic/TabelBasicMain";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Tables Basic">
        <Wrapper>
          <TabelBasicMain />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
