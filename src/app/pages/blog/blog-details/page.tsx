import Wrapper from "@/components/layouts/DefaultWrapper";
import BlogDetailsMainArea from "@/components/pagesUI/pages/blog/blog-details/BlogDetailsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const BlogDetailsStaticPageMain = () => {
  const id = 1;
  return (
    <>
      <MetaData pageTitle="Blog details">
        <Wrapper>
          <main>
          <BlogDetailsMainArea id={id}/>
          </main>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default BlogDetailsStaticPageMain;
