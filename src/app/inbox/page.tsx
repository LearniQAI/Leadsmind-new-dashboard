import Wrapper from "@/components/layouts/DefaultWrapper";
import EmailInboxMainArea from "@/components/pagesUI/apps/email-inbox/EmailInboxMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const EmailInboxMain = () => {
  return (
    <>
      <MetaData pageTitle="Email Inbox">
        <Wrapper>
          <EmailInboxMainArea/>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default EmailInboxMain;
