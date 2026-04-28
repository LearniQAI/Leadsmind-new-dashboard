
import Wrapper from "@/components/layouts/DefaultWrapper";
import SearchMainArea from "@/components/pagesUI/pages/search/SearchMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const SearchMain = () => {
  return (
    <>
      <MetaData pageTitle="Search">
        <Wrapper>
          <SearchMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default SearchMain;
