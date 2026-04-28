import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import TimeSheetTable from "../../hrm/timesheet/TimeSheetTable";
import ContactTable from "./ContactTable";
import ContactHead from "./ContactHead";

const ContactSMainArea = () => {
  return (
    <>
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Contacts" subTitle="HRM" />
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <div className="col-span-12">
            <div className="card__wrapper">
              <ContactHead />
              <ContactTable />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactSMainArea;
