import Wrapper from "@/components/layouts/DefaultWrapper";
import TabelDatabaseMain from "@/components/tables/table-database/TabelDatabaseMain";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Tables Database">
        <Wrapper>
          <TabelDatabaseMain />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
