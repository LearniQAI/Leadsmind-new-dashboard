import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IContact } from "@/interface/table.interface";

interface statePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IContact;
}

const ContactsDetailsModal = ({ open, setOpen, editData }: statePropsType) => {
  const handleToggle = () => setOpen(!open);

  return (
    <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
      <DialogTitle>
        <div className="flex justify-between">
          <h5 className="modal-title">Contacts Details</h5>
          <button onClick={handleToggle} type="button" className="bd-btn-close">
            <i className="fa-solid fa-xmark-large"></i>
          </button>
        </div>
      </DialogTitle>
      <DialogContent>
        <div className="card__wrapper">
          {/* row gy-20 align-items-center */}
          <div className="grid grid-cols-12 items-center gap-y-5">
            <div className="col-span-12">
              <div className="contacts__thumb-wrapper text-center">
                <div className="employee__profile-chnage inline-block">
                  <div className="employee__profile-edit">
                    <input
                      type="file"
                      id="imageUpload2"
                      accept=".png, .jpg, .jpeg"
                    />
                  </div>
                  <div className="employee__profile-preview">
                    <div
                      className="employee__profile-preview-box"
                      id="imagePreview2"
                      style={{
                        backgroundImage: `url(${editData?.userImg?.src || ""})`, // Display uploaded image or fallback to default
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12">
              <div className="label__content-wrapper">
                <span className="label__subtitle">Contacts Name</span>
                <h6 className="label__title">Naira Muskan</h6>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-6">
              <div className="label__content-wrapper">
                <span className="label__subtitle">Phone Number</span>
                <h6 className="label__title">+1 (555) 123-4567</h6>
              </div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="label__content-wrapper">
                <span className="label__subtitle">Email Address</span>
                <h6 className="label__title">ayshasiddika@manez.com</h6>
              </div>
            </div>
            <div className="col-span-12">
              <div className="label__content-wrapper">
                <span className="label__subtitle">Contacts Address</span>
                <h6 className="label__title">Gaza, Palestine</h6>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactsDetailsModal;
