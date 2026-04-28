import Wrapper from "@/components/layouts/DefaultWrapper";
import ContactSMainArea from "@/components/pagesUI/apps/contacts/ContactSMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Contact">
        <Wrapper>
          <ContactSMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
