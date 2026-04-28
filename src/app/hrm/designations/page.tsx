import Wrapper from "@/components/layouts/DefaultWrapper";
import DesignationsMainArea from "@/components/pagesUI/hrm/designations/DesignationsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Designation">
        <Wrapper>
          <DesignationsMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
