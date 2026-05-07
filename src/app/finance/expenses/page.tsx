import Wrapper from "@/components/layouts/DefaultWrapper";
import ExpenseMainArea from "@/components/pagesUI/expense/ExpenseMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Expense">
        <Wrapper>
          <ExpenseMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;
