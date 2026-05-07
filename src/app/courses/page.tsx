import Wrapper from "@/components/layouts/DefaultWrapper";
import TrainingMainArea from "@/components/pagesUI/training/TrainingMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Training">
        <Wrapper>
          <TrainingMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
