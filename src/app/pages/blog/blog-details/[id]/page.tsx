import Wrapper from "@/components/layouts/DefaultWrapper";
import BlogDetailsMainArea from "@/components/pagesUI/pages/blog/blog-details/BlogDetailsMainArea";
import MetaData from "@/hooks/useMetaData";

import React from "react";

const BlogDetailsDynamicPageMain = ({ params }: { params: { id: number } }) => {
  const id = params.id;
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

export default BlogDetailsDynamicPageMain;
