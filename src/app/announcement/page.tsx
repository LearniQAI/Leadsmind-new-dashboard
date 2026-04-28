import Wrapper from "@/components/layouts/DefaultWrapper";
import AnnouncementMainArea from "@/components/pagesUI/announcement/AnnouncementMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Announcement">
        <Wrapper>
          <AnnouncementMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
