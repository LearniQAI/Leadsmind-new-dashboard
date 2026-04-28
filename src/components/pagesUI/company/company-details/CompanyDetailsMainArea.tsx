"use client";
import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React, { useState } from "react";
import CompanySideContentSection from "./CompanySideContentSection";
import CompanyInfo from "./CompanyInfo";
import CompanyAddDealsModal from "./CompanyAddDealsModal";
import CompanySendMailModal from "./CompanySendMailModal";
import { idType } from "@/interface/common.interface";

const CompanyDetailsMainArea = ({ id }: idType) => {
  const [openModal, setOpenModal] = useState(false);
  const [openSendEMailModal, setSendEMailModal] = useState(false);
  const handleToggle = () => setOpenModal(!openModal);
  const handleSendEmailToggle = () => setSendEMailModal(!openSendEMailModal);

  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Company Details" subTitle="Home" />
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
              <div className="col-span-12 xl:col-span-3">
                <CompanyInfo
                  handleToggle={handleToggle}
                  handleSendEmailToggle={handleSendEmailToggle}
                />
              </div>
              <div className="col-span-12 xl:col-span-9">
                <CompanySideContentSection />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}
      {/* Render the modal */}
      {openModal && (
        <CompanyAddDealsModal open={openModal} setOpen={setOpenModal} />
      )}
      {openSendEMailModal && (
        <CompanySendMailModal
          open={openSendEMailModal}
          setOpen={setSendEMailModal}
        />
      )}
    </>
  );
};

export default CompanyDetailsMainArea;
