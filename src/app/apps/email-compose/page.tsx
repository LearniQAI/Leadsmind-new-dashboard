import Wrapper from "@/components/layouts/DefaultWrapper";
import EmailComposeMainArea from "@/components/pagesUI/apps/email-compose/EmailComposeMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const EmailComposeMain = () => {
  return (
    <>
      <MetaData pageTitle="Email Compose">
        <Wrapper>
          <EmailComposeMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default EmailComposeMain;
