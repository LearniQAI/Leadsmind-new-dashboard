import Wrapper from "@/components/layouts/DefaultWrapper";
import BlogMainArea from "@/components/pagesUI/pages/blog/blog-main/BlogMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const BlogMain = () => {
  return (
    <>
      <MetaData pageTitle="Blog">
        <Wrapper>
          <BlogMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default BlogMain;
