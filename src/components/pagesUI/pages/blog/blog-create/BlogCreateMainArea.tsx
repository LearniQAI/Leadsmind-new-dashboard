import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import BlogCreateForm from "@/form/blog/blog-create-form";
import React from "react";

const BlogCreateMainArea = () => {
  return <>
    {/* -- App side area start -- */}
    <div className="app__slide-wrapper">
      <Breadcrumb breadTitle="Blog Create" subTitle="Home" />
      <BlogCreateForm />
    </div>
    {/* -- App side area end -- */}
  </>;
};

export default BlogCreateMainArea;
