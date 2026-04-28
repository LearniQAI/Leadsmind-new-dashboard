"use client";
import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IPipeline } from "@/interface/table.interface";

interface statePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IPipeline;
}

const EditLabelsModal = ({ open, setOpen, editData }: statePropsType) => {
  const handleToggle = () => setOpen(!open);

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm" sx={{
          "& .MuiDialog-paper": {
            width: "500px",
          },
        }}>
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Edit Labels</h5>
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
          <form action="#">
            <div className="card__wrapper">
              <div className="from__input-box">
                <div className="form__input-title">
                  <label htmlFor="leadName2">Source Name</label>
                </div>
                <div className="form__input">
                  <input
                    className="form-control"
                    name="leadName2"
                    id="leadName2"
                    type="text"
                    defaultValue={editData?.pipeline}
                  />
                </div>
              </div>
            </div>
            <div className="submit__btn text-center">
              <button
                type="button"
                className="btn btn-danger me-[5px]"
                onClick={handleToggle}
              >
                Close
              </button>
              <button type="submit" className="btn btn-primary">
                Save changes
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditLabelsModal;
