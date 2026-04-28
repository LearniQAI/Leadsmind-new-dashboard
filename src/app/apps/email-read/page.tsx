import Wrapper from "@/components/layouts/DefaultWrapper";
import EmailReadMainArea from "@/components/pagesUI/apps/email-read/EmailReadMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const EmailReadMain = () => {
  return (
    <>
      <MetaData pageTitle="Email Read">
        <Wrapper>
          <EmailReadMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default EmailReadMain;
