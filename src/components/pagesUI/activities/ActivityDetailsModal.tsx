"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IActivity, IExpese } from "@/interface/table.interface";
import { expenseData } from "@/data/expense-data";
import Image, { StaticImageData } from "next/image";
import { useTableActivityStatusHook } from "@/hooks/use-condition-class";

interface statePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IActivity;
}

const ActivityDetailsModal = ({ open, setOpen, editData }: statePropsType) => {
  const stausClass = useTableActivityStatusHook(editData?.activityType);
  const [selectedTrainer, setSelectedTrainer] = useState<IExpese>(
    expenseData[0]
  );
  const handleToggle = () => setOpen(!open);

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Activities Details</h5>
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
          <div className="grid grid-cols-12 gap-y-5">
            <div className="col-span-12">
              <div className="label__content-wrapper">
                <span className="label__subtitle">Title</span>
                <h6 className="label__title">{editData?.title}</h6>
              </div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="label__content-wrapper">
                <span className="label__subtitle">Activity Type</span>
                <h6 className="label__title">
                  <span className={`bd-badge ${stausClass}`}>
                    {editData?.activityType}
                  </span>
                </h6>
              </div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="label__content-wrapper">
                <span className="label__subtitle">Owner Name</span>
                <h6 className="label__title flex justify-start items-center">
                  <Image
                    className="img-36 border-circle me-[5px]"
                    src={editData?.employeeImg as StaticImageData}
                    alt="image"
                  />{" "}
                  {editData?.owner}
                </h6>
              </div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="label__content-wrapper">
                <span className="label__subtitle">Create Date</span>
                <h6 className="label__title">{editData?.deadline}</h6>
              </div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="label__content-wrapper">
                <span className="label__subtitle">Dead Line</span>
                <h6 className="label__title">{editData?.createDate}</h6>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActivityDetailsModal;
