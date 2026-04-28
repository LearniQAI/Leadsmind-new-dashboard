import Wrapper from "@/components/layouts/DefaultWrapper";
import HolidaysMainArea from "@/components/pagesUI/hrm/holidays/HolidaysMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Holidays">
        <Wrapper>
          <HolidaysMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
