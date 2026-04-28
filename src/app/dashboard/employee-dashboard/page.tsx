import Wrapper from "@/components/layouts/DefaultWrapper";
import EmplyeeDashboardMainArea from "@/components/pagesUI/dashboard/employee-dashboard/EmplyeeDashboardMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const EmployeeDashboardMain = () => {
  return (
    <>
      <MetaData pageTitle="Employee Dashboard">
        <Wrapper>
          <EmplyeeDashboardMainArea/>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default EmployeeDashboardMain;
