"use client";
import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import Image from "next/image";
import adminImg from "../../../../../public/assets/images/avatar/avatar1.png";
import { dealsDetailsStatePropsType } from "@/interface/common.interface";

const DealsDetailsModal = ({ open, setOpen, editData }: dealsDetailsStatePropsType) => {
  const handleToggle = () => setOpen(!open);

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Deal Details</h5>
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
          <div className="card__wrapper">
            <div className="grid grid-cols-12 gap-y-5">
              <div className="col-span-12">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Deal Name</span>
                  <h6 className="label__title">Michael Johnson</h6>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Pipeline</span>
                  <h6 className="label__title">Open</h6>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Status</span>
                  <h6 className="label__title">Open</h6>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Value</span>
                  <h6 className="label__title">$5500.00</h6>
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
                  <span className="label__subtitle">Start Date</span>
                  <h6 className="label__title">15 April 2024</h6>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Expected End Date</span>
                  <h6 className="label__title">05 March 2024</h6>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Mobile Number</span>
                  <h6 className="label__title">+1 (555) 123456</h6>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Phone Number</span>
                  <h6 className="label__title">+123456</h6>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Email Address</span>
                  <h6 className="label__title">manez@example.com</h6>
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
                  <span className="label__subtitle">Assignee</span>
                  <h6 className="label__title flex items-center">
                    <Image
                      className="img-36 border-circle me-[5px]"
                      src={adminImg}
                      alt="image"
                    />
                    Ethan Mitchell
                  </h6>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Tag</span>
                  <h6 className="label__title">Clearance</h6>
                </div>
              </div>
              <div className="col-span-12">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Deal Description</span>
                  <p>
                    As a Sales Representative at Manez, you will play a key role
                    in driving revenue growth and expanding our customer base.
                    You will be responsible for identifying and prospecting new
                    leads, nurturing relationships with existing clients, and
                    closing sales opportunities. Your primary duties will
                    include.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DealsDetailsModal;
