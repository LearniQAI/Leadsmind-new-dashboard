"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { trainersData } from "@/data/dropdown-data";

import Image, { StaticImageData } from "next/image";
import { ITrainer } from "@/interface/dropdown.interface";
import { ILead } from "@/interface/table.interface";
import companyImg from "../../../../../public/assets/images/user/1.png";
import adminImg from "../../../../../public/assets/images/avatar/avatar1.png";

interface statePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: ILead;
}

const LeadDetailsModal = ({ open, setOpen, editData }: statePropsType) => {
  const handleToggle = () => setOpen(!open);

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Lead Update</h5>
            <button
              onClick={handleToggle}
              type="button"
              className="bd-btn-close"
            >
              <i className="fa-solid fa-xmark-large"></i>
            </button>
          </div>
        </DialogTitle>
        <DialogContent className="common-scrollbar overflow-y-auto">
          <form>
            <div className="card__wrapper">
              <div className="grid grid-cols-12 gap-y-6 gap-x-6 maxXs:gap-x-0 justify-center items-center">
                {/*col-span-12 md:col-span-6 */}
                <div className="col-span-12">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Lead Name</span>
                    <h6 className="label__title">{editData?.leadName}</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Lead Type</span>
                    <h6 className="label__title">{editData?.status}</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Company Name</span>
                    <h6 className="label__title flex items-center">
                      <Image
                        className="img-36 border-circle me-[10px]"
                        src={editData?.employeeImg as StaticImageData}
                        alt="image"
                      />
                      {editData?.companyName}
                    </h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Value</span>
                    <h6 className="label__title">$5000.00</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Currency</span>
                    <h6 className="label__title">$USD</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Mobile Number</span>
                    <h6 className="label__title">{editData?.phone}</h6>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Email Address</span>
                    <h6 className="label__title">{editData?.email}</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Source Type</span>
                    <h6 className="label__title">Linkedin</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Owner Name</span>
                    <h6 className="label__title flex items-center">
                      <Image
                        className="img-36 border-circle me-[5px]"
                        src={adminImg}
                        alt="image"
                      />
                      {editData?.companyName}
                    </h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Tag</span>
                    <div className="flex items-center gap-[10px]">
                      <span className="tag-badge">Clearance</span>
                      <span className="tag-badge">Year End</span>
                    </div>
                  </div>
                </div>
                <div className="col-span-12">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Lead Description</span>
                    <p>
                      As a Sales Representative at Manez, you will play a key
                      role in driving revenue growth and expanding our customer
                      base. You will be responsible for identifying and
                      prospecting new leads, nurturing relationships with
                      existing clients, and closing sales opportunities. Your
                      primary duties will include.
                    </p>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Lead Visibility</span>
                    <h6 className="label__title">Public</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Lead Status</span>
                    <h6 className="label__title">Active</h6>
                  </div>
                </div>
              </div>
            </div>
            <div className="submit__btn text-center">
              <button className="btn btn-primary">Submit</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeadDetailsModal;
