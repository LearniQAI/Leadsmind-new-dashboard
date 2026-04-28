import Wrapper from "@/components/layouts/DefaultWrapper";
import BlogCreateMainArea from "@/components/pagesUI/pages/blog/blog-create/BlogCreateMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const BlogCreateMain = () => {
  return <>
    <MetaData pageTitle="Blog Create">
      <Wrapper>
        <BlogCreateMainArea />
      </Wrapper>
    </MetaData>
  </>;
};

export default BlogCreateMain;

