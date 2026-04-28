import Wrapper from "@/components/layouts/DefaultWrapper";
import AdminLeavesMainArea from "@/components/pagesUI/hrm/admin-leaves/AdminLeavesMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Admin Leaves">
        <Wrapper>
          <AdminLeavesMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
